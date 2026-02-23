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

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
	'gpt-5.2': { input: 0.00175, output: 0.014 },
	'gpt-5.1': { input: 0.00125, output: 0.01 },
	'gpt-5': { input: 0.001, output: 0.008 },
	'gpt-5-mini': { input: 0.00025, output: 0.002 },
	'gpt-5-nano': { input: 0.00005, output: 0.0004 },
	'o4-mini': { input: 0.0011, output: 0.0044 },
	'o3-mini': { input: 0.0011, output: 0.0044 },
	o3: { input: 0.01, output: 0.04 },
	'gpt-4o': { input: 0.0025, output: 0.01 },
	'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
}

const CHAT_MODEL_PREFIXES = ['gpt-5', 'gpt-4o', 'gpt-4-', 'o1', 'o3', 'o4', 'chatgpt-']
const EXCLUDED_PREFIXES = ['gpt-image', 'gpt-5.1-codex']

const KNOWN_MODELS: ModelInfo[] = [
	{
		id: 'gpt-5.2',
		name: 'GPT-5.2',
		provider: 'openai',
		contextWindow: 200_000,
		supportsTools: true,
		supportsStreaming: true,
		costPer1kInput: 0.00175,
		costPer1kOutput: 0.014,
	},
	{
		id: 'gpt-5-mini',
		name: 'GPT-5 Mini',
		provider: 'openai',
		contextWindow: 128_000,
		supportsTools: true,
		supportsStreaming: true,
		costPer1kInput: 0.00025,
		costPer1kOutput: 0.002,
	},
	{
		id: 'o4-mini',
		name: 'o4 Mini',
		provider: 'openai',
		contextWindow: 200_000,
		supportsTools: true,
		supportsStreaming: true,
		costPer1kInput: 0.0011,
		costPer1kOutput: 0.0044,
	},
	{
		id: 'o3-mini',
		name: 'o3 Mini',
		provider: 'openai',
		contextWindow: 200_000,
		supportsTools: true,
		supportsStreaming: true,
		costPer1kInput: 0.0011,
		costPer1kOutput: 0.0044,
	},
]

function isChatModel(id: string): boolean {
	if (EXCLUDED_PREFIXES.some((p) => id.startsWith(p))) return false
	return CHAT_MODEL_PREFIXES.some((p) => id.startsWith(p))
}

function lookupPricing(modelId: string): { input: number; output: number } | undefined {
	if (MODEL_PRICING[modelId]) return MODEL_PRICING[modelId]
	for (const key of Object.keys(MODEL_PRICING)) {
		if (modelId.startsWith(key)) return MODEL_PRICING[key]
	}
	return undefined
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

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
	const pricing = lookupPricing(model)
	if (!pricing) return 0
	return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output
}

export class OpenAIProvider implements LLMProvider {
	readonly id = 'openai'
	readonly name = 'OpenAI'
	private client: OpenAI
	private modelCache: ModelInfo[] | null = null
	private modelCacheExpiry = 0

	constructor(apiKey: string) {
		this.client = new OpenAI({ apiKey })
	}

	async chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
		const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
			model: config.model,
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
				cost: calculateCost(config.model, inputTokens, outputTokens),
			},
			model: response.model,
			provider: this.id,
		}
	}

	async *stream(messages: LLMMessage[], config: LLMConfig): AsyncIterableIterator<LLMChunk> {
		const params: OpenAI.Chat.ChatCompletionCreateParamsStreaming = {
			model: config.model,
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
		if (this.modelCache && Date.now() < this.modelCacheExpiry) return this.modelCache

		try {
			const models: ModelInfo[] = []
			for await (const m of this.client.models.list()) {
				if (!isChatModel(m.id)) continue
				const pricing = lookupPricing(m.id)
				models.push({
					id: m.id,
					name: m.id,
					provider: 'openai',
					contextWindow: m.id.startsWith('o') ? 200_000 : 128_000,
					supportsTools: true,
					supportsStreaming: true,
					costPer1kInput: pricing?.input ?? 0,
					costPer1kOutput: pricing?.output ?? 0,
				})
			}
			if (models.length > 0) {
				models.sort((a, b) => {
					const aPrice = a.costPer1kOutput || 0
					const bPrice = b.costPer1kOutput || 0
					return bPrice - aPrice
				})
				this.modelCache = models
				this.modelCacheExpiry = Date.now() + 3_600_000
				return models
			}
		} catch {}

		return KNOWN_MODELS
	}
}
