import OpenAI from 'openai'
import type {
	LLMChunk,
	LLMConfig,
	LLMMessage,
	LLMProvider,
	LLMResponse,
	ModelInfo,
	ToolCall,
	ToolDefinition,
} from '../types.js'

interface GenericOpenAIOptions {
	baseUrl: string
	apiKey: string
	model?: string
	name?: string
	providerId?: string
}

function toOpenAIMessages(
	messages: LLMMessage[],
	systemPrompt?: string,
): OpenAI.Chat.ChatCompletionMessageParam[] {
	const result: OpenAI.Chat.ChatCompletionMessageParam[] = []

	if (systemPrompt) {
		result.push({ role: 'system', content: systemPrompt })
	}

	for (const msg of messages) {
		if (msg.role === 'system') {
			if (!systemPrompt) {
				result.push({ role: 'system', content: msg.content })
			}
			continue
		}

		if (msg.role === 'tool' && msg.toolResults) {
			for (const tr of msg.toolResults) {
				result.push({
					role: 'tool',
					tool_call_id: tr.callId,
					content: typeof tr.output === 'string' ? tr.output : JSON.stringify(tr.output),
				})
			}
			continue
		}

		if (msg.role === 'assistant' && msg.toolCalls?.length) {
			result.push({
				role: 'assistant',
				content: msg.content || null,
				tool_calls: msg.toolCalls.map((tc) => ({
					id: tc.id,
					type: 'function' as const,
					function: {
						name: tc.name,
						arguments: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input),
					},
				})),
			})
			continue
		}

		result.push({
			role: msg.role as 'user' | 'assistant',
			content: msg.content,
		})
	}

	return result
}

function toOpenAITools(tools: ToolDefinition[]): OpenAI.Chat.ChatCompletionTool[] {
	return tools.map((t) => ({
		type: 'function' as const,
		function: {
			name: t.name,
			description: t.description,
			parameters: t.inputSchema,
		},
	}))
}

function extractToolCalls(choices: OpenAI.Chat.ChatCompletion.Choice[]): ToolCall[] {
	const calls = choices[0]?.message?.tool_calls
	if (!calls) return []
	return calls
		.filter(
			(tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall =>
				tc.type === 'function',
		)
		.map((tc) => ({
			id: tc.id,
			name: tc.function.name,
			input: parseJSON(tc.function.arguments),
		}))
}

function parseJSON(str: string): unknown {
	try {
		return JSON.parse(str)
	} catch {
		return str
	}
}

export class GenericOpenAIProvider implements LLMProvider {
	readonly id: string
	readonly name: string
	private client: OpenAI
	private defaultModel: string | undefined

	constructor(options: GenericOpenAIOptions) {
		this.id = options.providerId ?? 'generic-openai'
		this.name = options.name ?? 'Generic OpenAI'
		this.defaultModel = options.model
		this.client = new OpenAI({
			apiKey: options.apiKey,
			baseURL: options.baseUrl,
		})
	}

	async chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
		const model = config.model || this.defaultModel || 'default'

		const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
			model,
			messages: toOpenAIMessages(messages, config.systemPrompt),
			...(config.temperature != null ? { temperature: config.temperature } : {}),
			...(config.maxTokens != null ? { max_tokens: config.maxTokens } : {}),
			...(config.tools?.length ? { tools: toOpenAITools(config.tools) } : {}),
		}

		const response = await this.client.chat.completions.create(params)

		const inputTokens = response.usage?.prompt_tokens ?? 0
		const outputTokens = response.usage?.completion_tokens ?? 0

		return {
			content: response.choices[0]?.message?.content ?? '',
			toolCalls: extractToolCalls(response.choices),
			usage: {
				inputTokens,
				outputTokens,
				cost: 0,
			},
			model: response.model,
			provider: this.id,
		}
	}

	async *stream(messages: LLMMessage[], config: LLMConfig): AsyncIterableIterator<LLMChunk> {
		const model = config.model || this.defaultModel || 'default'

		const params: OpenAI.Chat.ChatCompletionCreateParamsStreaming = {
			model,
			messages: toOpenAIMessages(messages, config.systemPrompt),
			stream: true,
			...(config.temperature != null ? { temperature: config.temperature } : {}),
			...(config.maxTokens != null ? { max_tokens: config.maxTokens } : {}),
			...(config.tools?.length ? { tools: toOpenAITools(config.tools) } : {}),
		}

		const stream = await this.client.chat.completions.create(params)

		const toolCallAccumulators = new Map<number, { id: string; name: string; argsBuf: string }>()

		for await (const chunk of stream) {
			const delta = chunk.choices[0]?.delta

			if (delta?.content) {
				yield { content: delta.content, done: false }
			}

			if (delta?.tool_calls) {
				for (const tc of delta.tool_calls) {
					if (!toolCallAccumulators.has(tc.index)) {
						toolCallAccumulators.set(tc.index, {
							id: tc.id ?? '',
							name: tc.function?.name ?? '',
							argsBuf: '',
						})
					}
					const acc = toolCallAccumulators.get(tc.index)
					if (!acc) continue
					if (tc.id) acc.id = tc.id
					if (tc.function?.name) acc.name = tc.function.name
					if (tc.function?.arguments) acc.argsBuf += tc.function.arguments
				}
			}

			if (chunk.choices[0]?.finish_reason === 'tool_calls') {
				for (const acc of toolCallAccumulators.values()) {
					yield {
						content: '',
						done: false,
						toolCall: {
							id: acc.id,
							name: acc.name,
							input: parseJSON(acc.argsBuf),
						},
					}
				}
				toolCallAccumulators.clear()
			}

			if (chunk.choices[0]?.finish_reason === 'stop') {
				yield { content: '', done: true }
			}
		}
	}

	async listModels(): Promise<ModelInfo[]> {
		const response = await this.client.models.list()
		const models: ModelInfo[] = []

		for await (const m of response) {
			models.push({
				id: m.id,
				name: m.id,
				provider: this.id,
				contextWindow: 0,
				supportsTools: true,
				supportsStreaming: true,
				costPer1kInput: 0,
				costPer1kOutput: 0,
			})
		}

		return models
	}
}
