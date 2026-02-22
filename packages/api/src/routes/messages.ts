import type { LLMMessage, LLMResponse, RouterConfig } from '@openmotoko/core'
import {
	activity,
	conversations,
	costLog,
	eventBus,
	getDb,
	LLMRouter,
	messages,
	nanoid,
} from '@openmotoko/core'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'

const sendMessageSchema = z.object({
	content: z.string().min(1),
	model: z.string().optional(),
})

const idParamsSchema = z.object({
	id: z.string().min(1),
})

let router: LLMRouter | null = null

function getRouter(): LLMRouter {
	if (!router) {
		const config: RouterConfig = {
			providers: [],
			modelAliases: {
				fast: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' },
				smart: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
				balanced: { provider: 'openai', model: 'gpt-4o' },
			},
		}
		router = new LLMRouter(config)
	}
	return router
}

interface DbMessage {
	role: string
	content: string
	toolCalls: string | null
	toolResults: string | null
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
			toolCalls: msg.toolCalls ? JSON.parse(msg.toolCalls) : undefined,
			toolResults: msg.toolResults ? JSON.parse(msg.toolResults) : undefined,
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

			let response: LLMResponse | undefined
			let loopCount = 0
			const maxLoops = 10
			const llmRouter = getRouter()

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
					tokens: response.usage.inputTokens + response.usage.outputTokens,
					cost: response.usage.cost,
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

					const toolOutput = JSON.stringify({
						error: `Tool ${toolCall.name} execution not yet connected to skill runtime`,
					})

					eventBus.emit('tool:result', {
						type: 'tool:result',
						conversationId,
						toolName: toolCall.name,
						result: toolOutput,
					})

					llmMessages.push({
						role: 'tool',
						content: toolOutput,
						toolResults: [{ callId: toolCall.id, output: toolOutput }],
					})

					await db.insert(messages).values({
						id: nanoid(),
						conversationId,
						role: 'tool',
						content: toolOutput,
						toolCalls: null,
						toolResults: JSON.stringify([{ callId: toolCall.id, output: toolOutput }]),
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

			const assistantMessageId = nanoid()
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
