import Anthropic from '@anthropic-ai/sdk'
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
	'claude-opus-4-6': { input: 0.005, output: 0.025 },
	'claude-sonnet-4-6': { input: 0.003, output: 0.015 },
	'claude-haiku-4-5': { input: 0.001, output: 0.005 },
	'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
	'claude-3-5-haiku-20241022': { input: 0.0008, output: 0.004 },
	'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
	'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
}

const KNOWN_MODELS: ModelInfo[] = [
	{
		id: 'claude-opus-4-6',
		name: 'Claude Opus 4.6',
		provider: 'anthropic',
		contextWindow: 200_000,
		supportsTools: true,
		supportsStreaming: true,
		costPer1kInput: 0.005,
		costPer1kOutput: 0.025,
	},
	{
		id: 'claude-sonnet-4-6',
		name: 'Claude Sonnet 4.6',
		provider: 'anthropic',
		contextWindow: 200_000,
		supportsTools: true,
		supportsStreaming: true,
		costPer1kInput: 0.003,
		costPer1kOutput: 0.015,
	},
	{
		id: 'claude-haiku-4-5',
		name: 'Claude Haiku 4.5',
		provider: 'anthropic',
		contextWindow: 200_000,
		supportsTools: true,
		supportsStreaming: true,
		costPer1kInput: 0.001,
		costPer1kOutput: 0.005,
	},
]

function lookupPricing(modelId: string): { input: number; output: number } | undefined {
	if (MODEL_PRICING[modelId]) return MODEL_PRICING[modelId]
	for (const key of Object.keys(MODEL_PRICING)) {
		if (modelId.startsWith(key)) return MODEL_PRICING[key]
	}
	return undefined
}

function toAnthropicMessages(messages: LLMMessage[]): Anthropic.MessageCreateParams['messages'] {
	const result: Anthropic.MessageCreateParams['messages'] = []

	for (const msg of messages) {
		if (msg.role === 'system') continue

		if (msg.role === 'tool' && msg.toolResults) {
			for (const tr of msg.toolResults) {
				result.push({
					role: 'user',
					content: [
						{
							type: 'tool_result',
							tool_use_id: tr.callId,
							content: typeof tr.output === 'string' ? tr.output : JSON.stringify(tr.output),
							is_error: tr.isError ?? false,
						},
					],
				})
			}
			continue
		}

		if (msg.role === 'assistant' && msg.toolCalls?.length) {
			const content: Anthropic.ContentBlockParam[] = []
			if (msg.content) {
				content.push({ type: 'text', text: msg.content })
			}
			for (const tc of msg.toolCalls) {
				content.push({
					type: 'tool_use',
					id: tc.id,
					name: tc.name,
					input: tc.input as Record<string, unknown>,
				})
			}
			result.push({ role: 'assistant', content })
			continue
		}

		result.push({
			role: msg.role as 'user' | 'assistant',
			content: msg.content,
		})
	}

	return result
}

function toAnthropicTools(tools: ToolDefinition[]): Anthropic.Tool[] {
	return tools.map((t) => ({
		name: t.name,
		description: t.description,
		input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
	}))
}

function extractToolCalls(message: Anthropic.Message): ToolCall[] {
	return message.content
		.filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
		.map((block) => ({
			id: block.id,
			name: block.name,
			input: block.input,
		}))
}

function extractText(message: Anthropic.Message): string {
	return message.content
		.filter((block): block is Anthropic.TextBlock => block.type === 'text')
		.map((block) => block.text)
		.join('')
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
	const pricing = lookupPricing(model)
	if (!pricing) return 0
	return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output
}

export class AnthropicProvider implements LLMProvider {
	readonly id = 'anthropic'
	readonly name = 'Anthropic'
	private client: Anthropic
	private modelCache: ModelInfo[] | null = null
	private modelCacheExpiry = 0

	constructor(apiKey: string) {
		this.client = new Anthropic({ apiKey })
	}

	async chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
		const systemPrompt = config.systemPrompt ?? messages.find((m) => m.role === 'system')?.content

		const params: Anthropic.MessageCreateParams = {
			model: config.model,
			max_tokens: config.maxTokens ?? 4096,
			messages: toAnthropicMessages(messages),
			...(systemPrompt ? { system: systemPrompt } : {}),
			...(config.temperature != null ? { temperature: config.temperature } : {}),
			...(config.tools?.length ? { tools: toAnthropicTools(config.tools) } : {}),
		}

		const response = await this.client.messages.create(params)

		const inputTokens = response.usage.input_tokens
		const outputTokens = response.usage.output_tokens

		return {
			content: extractText(response),
			toolCalls: extractToolCalls(response),
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
		const systemPrompt = config.systemPrompt ?? messages.find((m) => m.role === 'system')?.content

		const params: Anthropic.MessageCreateParams = {
			model: config.model,
			max_tokens: config.maxTokens ?? 4096,
			messages: toAnthropicMessages(messages),
			...(systemPrompt ? { system: systemPrompt } : {}),
			...(config.temperature != null ? { temperature: config.temperature } : {}),
			...(config.tools?.length ? { tools: toAnthropicTools(config.tools) } : {}),
		}

		const stream = this.client.messages.stream(params)
		let currentToolUse: { id: string; name: string; jsonBuf: string } | null = null

		for await (const event of stream) {
			if (event.type === 'content_block_start') {
				if (event.content_block.type === 'tool_use') {
					currentToolUse = {
						id: event.content_block.id,
						name: event.content_block.name,
						jsonBuf: '',
					}
				}
			} else if (event.type === 'content_block_delta') {
				if (event.delta.type === 'text_delta') {
					yield { content: event.delta.text, done: false }
				} else if (event.delta.type === 'input_json_delta' && currentToolUse) {
					currentToolUse.jsonBuf += event.delta.partial_json
				}
			} else if (event.type === 'content_block_stop') {
				if (currentToolUse) {
					let input: unknown = {}
					try {
						input = JSON.parse(currentToolUse.jsonBuf)
					} catch {
						input = currentToolUse.jsonBuf
					}
					yield {
						content: '',
						done: false,
						toolCall: {
							id: currentToolUse.id,
							name: currentToolUse.name,
							input,
						},
					}
					currentToolUse = null
				}
			} else if (event.type === 'message_stop') {
				yield { content: '', done: true }
			}
		}
	}

	async listModels(): Promise<ModelInfo[]> {
		if (this.modelCache && Date.now() < this.modelCacheExpiry) return this.modelCache

		try {
			const models: ModelInfo[] = []
			for await (const m of this.client.models.list({ limit: 100 })) {
				const pricing = lookupPricing(m.id)
				models.push({
					id: m.id,
					name: m.display_name,
					provider: 'anthropic',
					contextWindow: 200_000,
					supportsTools: true,
					supportsStreaming: true,
					costPer1kInput: pricing?.input ?? 0,
					costPer1kOutput: pricing?.output ?? 0,
				})
			}
			if (models.length > 0) {
				this.modelCache = models
				this.modelCacheExpiry = Date.now() + 3_600_000
				return models
			}
		} catch {}

		return KNOWN_MODELS
	}
}
