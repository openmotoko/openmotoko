import type { LLMMessage, LLMResponse } from '@openmotoko/core'
import {
	activity,
	conversations,
	costLog,
	eventBus,
	getAgentRuntime,
	getDb,
	messages,
	nanoid,
} from '@openmotoko/core'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'

const MAX_MESSAGE_LENGTH = 100_000

const sendMessageSchema = z.object({
	content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
	model: z.string().max(64).optional(),
})

const idParamsSchema = z.object({
	id: z.string().min(1),
})

interface DbMessage {
	role: string
	content: string
	toolCalls: string | null
	toolResults: string | null
}

function safeJsonParse(raw: string | null): unknown {
	if (!raw) return undefined
	try {
		return JSON.parse(raw)
	} catch {
		return undefined
	}
}

function buildMessages(systemPrompt: string | null, dbMessages: DbMessage[]): LLMMessage[] {
	const msgs: LLMMessage[] = []

	if (systemPrompt) {
		msgs.push({ role: 'system', content: systemPrompt })
	}

	for (const msg of dbMessages) {
		msgs.push({
			role: msg.role as LLMMessage['role'],
			content: msg.content,
			toolCalls: safeJsonParse(msg.toolCalls) as LLMMessage['toolCalls'],
			toolResults: safeJsonParse(msg.toolResults) as LLMMessage['toolResults'],
		})
	}

	return msgs
}

export default async function messageRoutes(fastify: FastifyInstance) {
	fastify.post(
		'/api/conversations/:id/messages',
		{ preHandler: validate({ params: idParamsSchema, body: sendMessageSchema }) },
		async (request, reply) => {
			const params = request.params as { id: string }
			const body = request.body as { content: string; model?: string }
			const db = getDb()
			const { id: conversationId } = params
			const { content, model: requestModel } = body

			const [conversation] = await db
				.select()
				.from(conversations)
				.where(eq(conversations.id, conversationId))
				.limit(1)

			if (!conversation) {
				return reply.status(404).send({
					error: 'Conversation not found',
					code: 'NOT_FOUND',
				})
			}

			const userMessageId = nanoid()
			const now = Date.now()

			await db.insert(messages).values({
				id: userMessageId,
				conversationId,
				role: 'user',
				content,
				toolCalls: null,
				toolResults: null,
				tokens: 0,
				cost: 0,
				model: null,
				provider: null,
				createdAt: now,
			})

			eventBus.emit('message:received', {
				type: 'message:received',
				conversationId,
				role: 'user',
				content,
			})

			const existingMessages = await db
				.select()
				.from(messages)
				.where(eq(messages.conversationId, conversationId))
				.orderBy(messages.createdAt)

			const model = requestModel ?? conversation.model ?? 'smart'
			const llmMessages = buildMessages(conversation.systemPrompt, existingMessages)
			const runtime = getAgentRuntime()

			const budgetCheck = await runtime.checkBudget(0)
			if (!budgetCheck.allowed) {
				return reply.status(429).send({
					error: budgetCheck.reason ?? 'Budget limit exceeded',
					code: 'BUDGET_EXCEEDED',
				})
			}

			let response: LLMResponse | undefined
			let loopCount = 0
			const maxLoops = 10
			const llmRouter = runtime.getRouter()

			while (loopCount < maxLoops) {
				loopCount++

				try {
					response = await llmRouter.chat(llmMessages, { model })
				} catch (err) {
					const errorMsg = err instanceof Error ? err.message : 'LLM call failed'
					return reply.status(502).send({
						error: errorMsg,
						code: 'LLM_ERROR',
					})
				}

				eventBus.emit('llm:complete', {
					type: 'llm:complete',
					conversationId,
					tokens: (response.usage?.inputTokens ?? 0) + (response.usage?.outputTokens ?? 0),
					cost: response.usage?.cost ?? 0,
				})

				if (response.usage) {
					await db.insert(costLog).values({
						id: nanoid(),
						conversationId,
						provider: response.provider,
						model: response.model,
						inputTokens: response.usage.inputTokens,
						outputTokens: response.usage.outputTokens,
						cost: response.usage.cost,
						createdAt: Date.now(),
					})

					eventBus.emit('cost:updated', {
						type: 'cost:updated',
						conversationId,
						provider: response.provider,
						model: response.model,
						cost: response.usage.cost,
					})
				}

				if (!response.toolCalls || response.toolCalls.length === 0) {
					break
				}

				const assistantToolMsg: LLMMessage = {
					role: 'assistant',
					content: response.content ?? '',
					toolCalls: response.toolCalls,
				}
				llmMessages.push(assistantToolMsg)

				await db.insert(messages).values({
					id: nanoid(),
					conversationId,
					role: 'assistant',
					content: response.content ?? '',
					toolCalls: JSON.stringify(response.toolCalls),
					toolResults: null,
					tokens: response.usage.inputTokens + response.usage.outputTokens,
					cost: response.usage.cost,
					model: response.model,
					provider: response.provider,
					createdAt: Date.now(),
				})

				for (const toolCall of response.toolCalls) {
					eventBus.emit('tool:called', {
						type: 'tool:called',
						conversationId,
						toolName: toolCall.name,
						args: toolCall.input as Record<string, unknown>,
					})

					const skillId = runtime.findSkillForTool(toolCall.name)
					const toolOutput = await runtime.executeToolCall(toolCall.name, toolCall.input)

					eventBus.emit('tool:result', {
						type: 'tool:result',
						conversationId,
						toolName: toolCall.name,
						result: toolOutput,
					})

					if (skillId) {
						await db.insert(activity).values({
							id: nanoid(),
							type: 'skill:activated',
							conversationId,
							channel: null,
							skillId,
							data: JSON.stringify({ tool: toolCall.name }),
							createdAt: Date.now(),
						})
					}

					llmMessages.push({
						role: 'tool',
						content: toolOutput,
						toolResults: [{ callId: toolCall.id, toolName: toolCall.name, output: toolOutput }],
					})

					await db.insert(messages).values({
						id: nanoid(),
						conversationId,
						role: 'tool',
						content: toolOutput,
						toolCalls: null,
						toolResults: JSON.stringify([
							{ callId: toolCall.id, toolName: toolCall.name, output: toolOutput },
						]),
						tokens: 0,
						cost: 0,
						model: null,
						provider: null,
						createdAt: Date.now(),
					})
				}
			}

			if (!response) {
				return reply.status(500).send({
					error: 'No response from LLM',
					code: 'LLM_ERROR',
				})
			}

			const finalHadToolCalls = response.toolCalls && response.toolCalls.length > 0
			const assistantMessageId = nanoid()

			if (!finalHadToolCalls) {
				await db.insert(messages).values({
					id: assistantMessageId,
					conversationId,
					role: 'assistant',
					content: response.content,
					toolCalls: null,
					toolResults: null,
					tokens: response.usage.inputTokens + response.usage.outputTokens,
					cost: response.usage.cost,
					model: response.model,
					provider: response.provider,
					createdAt: Date.now(),
				})
			}

			await db
				.update(conversations)
				.set({ updatedAt: Date.now() })
				.where(eq(conversations.id, conversationId))

			eventBus.emit('message:sent', {
				type: 'message:sent',
				conversationId,
				role: 'assistant',
				content: response.content,
			})

			await db.insert(activity).values({
				id: nanoid(),
				type: 'message:sent',
				conversationId,
				channel: null,
				skillId: null,
				data: JSON.stringify({
					model: response.model,
					provider: response.provider,
					tokens: response.usage.inputTokens + response.usage.outputTokens,
				}),
				createdAt: Date.now(),
			})

			return reply.send({
				id: assistantMessageId,
				conversationId,
				role: 'assistant',
				content: response.content,
				model: response.model,
				provider: response.provider,
				usage: response.usage,
			})
		},
	)
}
