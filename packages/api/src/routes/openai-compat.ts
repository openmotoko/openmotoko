import type { LLMMessage, ToolDefinition } from '@openmotoko/core'
import { getAgentRuntime, nanoid } from '@openmotoko/core'
import type { FastifyInstance } from 'fastify'

interface OpenAIChatMessage {
	role: 'system' | 'user' | 'assistant' | 'tool'
	content: string | null
	name?: string
	tool_calls?: { id: string; type: string; function: { name: string; arguments: string } }[]
	tool_call_id?: string
}

interface OpenAIChatRequest {
	model: string
	messages: OpenAIChatMessage[]
	temperature?: number
	max_tokens?: number
	stream?: boolean
	tools?: {
		type: string
		function: { name: string; description: string; parameters: Record<string, unknown> }
	}[]
}

interface OpenAIChatChoice {
	index: number
	message: {
		role: 'assistant'
		content: string | null
		tool_calls?: { id: string; type: string; function: { name: string; arguments: string } }[]
	}
	finish_reason: string
}

interface OpenAIChatResponse {
	id: string
	object: string
	created: number
	model: string
	choices: OpenAIChatChoice[]
	usage: {
		prompt_tokens: number
		completion_tokens: number
		total_tokens: number
	}
}

function safeJsonParse(str: string): unknown {
	try {
		return JSON.parse(str)
	} catch {
		return str
	}
}

function convertMessages(messages: OpenAIChatMessage[]): LLMMessage[] {
	return messages.map((m) => {
		const msg: LLMMessage = {
			role: m.role,
			content: m.content ?? '',
		}

		if (m.tool_calls) {
			msg.toolCalls = m.tool_calls.map((tc) => ({
				id: tc.id,
				name: tc.function.name,
				input: safeJsonParse(tc.function.arguments),
			}))
		}

		if (m.role === 'tool' && m.tool_call_id) {
			msg.toolResults = [
				{
					callId: m.tool_call_id,
					output: m.content ?? '',
				},
			]
		}

		return msg
	})
}

function convertTools(tools?: OpenAIChatRequest['tools']): ToolDefinition[] | undefined {
	if (!tools || tools.length === 0) return undefined
	return tools.map((t) => ({
		name: t.function.name,
		description: t.function.description,
		inputSchema: t.function.parameters,
	}))
}

export default async function openaiCompatRoutes(fastify: FastifyInstance) {
	fastify.post('/v1/chat/completions', async (request, reply) => {
		const body = request.body as OpenAIChatRequest

		if (!body.messages || !body.model) {
			return reply.status(400).send({
				error: { message: 'messages and model are required', type: 'invalid_request_error' },
			})
		}

		const runtime = getAgentRuntime()
		const router = runtime.getRouter()
		const llmMessages = convertMessages(body.messages)
		const tools = convertTools(body.tools)

		if (body.stream) {
			reply.raw.writeHead(200, {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
			})

			const streamId = `chatcmpl-${nanoid()}`
			const created = Math.floor(Date.now() / 1000)

			try {
				const stream = router.stream(llmMessages, {
					model: body.model,
					temperature: body.temperature,
					maxTokens: body.max_tokens,
					tools,
				})

				for await (const chunk of stream) {
					const delta: Record<string, unknown> = {}
					if (chunk.content) delta.content = chunk.content
					if (chunk.toolCall) {
						delta.tool_calls = [
							{
								index: 0,
								id: chunk.toolCall.id,
								type: 'function',
								function: {
									name: chunk.toolCall.name,
									arguments:
										typeof chunk.toolCall.input === 'string'
											? chunk.toolCall.input
											: JSON.stringify(chunk.toolCall.input),
								},
							},
						]
					}

					const event = {
						id: streamId,
						object: 'chat.completion.chunk',
						created,
						model: body.model,
						choices: [
							{
								index: 0,
								delta,
								finish_reason: chunk.done ? 'stop' : null,
							},
						],
					}

					reply.raw.write(`data: ${JSON.stringify(event)}\n\n`)
				}

				reply.raw.write('data: [DONE]\n\n')
			} catch (err) {
				const errorEvent = {
					error: {
						message: err instanceof Error ? err.message : 'Stream failed',
						type: 'server_error',
					},
				}
				reply.raw.write(`data: ${JSON.stringify(errorEvent)}\n\n`)
			}

			reply.raw.end()
			return
		}

		try {
			const result = await router.chat(llmMessages, {
				model: body.model,
				temperature: body.temperature,
				maxTokens: body.max_tokens,
				tools,
			})

			const toolCalls =
				result.toolCalls.length > 0
					? result.toolCalls.map((tc) => ({
							id: tc.id,
							type: 'function' as const,
							function: {
								name: tc.name,
								arguments: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input),
							},
						}))
					: undefined

			const response: OpenAIChatResponse = {
				id: `chatcmpl-${nanoid()}`,
				object: 'chat.completion',
				created: Math.floor(Date.now() / 1000),
				model: result.model,
				choices: [
					{
						index: 0,
						message: {
							role: 'assistant',
							content: result.content || null,
							tool_calls: toolCalls,
						},
						finish_reason: toolCalls ? 'tool_calls' : 'stop',
					},
				],
				usage: {
					prompt_tokens: result.usage.inputTokens,
					completion_tokens: result.usage.outputTokens,
					total_tokens: result.usage.inputTokens + result.usage.outputTokens,
				},
			}

			return reply.send(response)
		} catch (err) {
			return reply.status(500).send({
				error: {
					message: err instanceof Error ? err.message : 'Internal server error',
					type: 'server_error',
				},
			})
		}
	})

	fastify.get('/v1/models', async (_request, reply) => {
		const runtime = getAgentRuntime()
		const router = runtime.getRouter()
		const providers = router.listProviders()

		const models: { id: string; object: string; created: number; owned_by: string }[] = []

		for (const provider of providers) {
			try {
				const providerModels = await provider.listModels()
				for (const m of providerModels) {
					models.push({
						id: m.id,
						object: 'model',
						created: Math.floor(Date.now() / 1000),
						owned_by: m.provider,
					})
				}
			} catch {}
		}

		return reply.send({ object: 'list', data: models })
	})
}
