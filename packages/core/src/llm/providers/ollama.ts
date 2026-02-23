import { Ollama } from 'ollama'
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

function toOllamaMessages(
	messages: LLMMessage[],
	systemPrompt?: string,
): Array<{ role: string; content: string }> {
	const result: Array<{ role: string; content: string }> = []

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
					content: typeof tr.output === 'string' ? tr.output : JSON.stringify(tr.output),
				})
			}
			continue
		}

		result.push({ role: msg.role, content: msg.content })
	}

	return result
}

function toOllamaTools(tools: ToolDefinition[]): Array<{
	type: 'function'
	function: { name: string; description: string; parameters: Record<string, unknown> }
}> {
	return tools.map((t) => ({
		type: 'function' as const,
		function: {
			name: t.name,
			description: t.description,
			parameters: t.inputSchema,
		},
	}))
}

function extractToolCalls(
	toolCalls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }>,
): ToolCall[] {
	if (!toolCalls?.length) return []
	return toolCalls.map((tc, idx) => ({
		id: `ollama_call_${idx}`,
		name: tc.function.name,
		input: tc.function.arguments,
	}))
}

export class OllamaProvider implements LLMProvider {
	readonly id = 'ollama'
	readonly name = 'Ollama'
	private client: Ollama

	constructor(host = 'http://localhost:11434') {
		this.client = new Ollama({ host })
	}

	async chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
		const response = await this.client.chat({
			model: config.model,
			messages: toOllamaMessages(messages, config.systemPrompt),
			...(config.tools?.length ? { tools: toOllamaTools(config.tools) } : {}),
			options: {
				...(config.temperature != null ? { temperature: config.temperature } : {}),
				...(config.maxTokens != null ? { num_predict: config.maxTokens } : {}),
			},
		})

		const toolCalls = extractToolCalls(
			response.message.tool_calls as
				| Array<{
						function: { name: string; arguments: Record<string, unknown> }
				  }>
				| undefined,
		)

		return {
			content: response.message.content,
			toolCalls,
			usage: {
				inputTokens: response.prompt_eval_count ?? 0,
				outputTokens: response.eval_count ?? 0,
				cost: 0,
			},
			model: config.model,
			provider: this.id,
		}
	}

	async *stream(messages: LLMMessage[], config: LLMConfig): AsyncIterableIterator<LLMChunk> {
		const response = await this.client.chat({
			model: config.model,
			messages: toOllamaMessages(messages, config.systemPrompt),
			stream: true,
			...(config.tools?.length ? { tools: toOllamaTools(config.tools) } : {}),
			options: {
				...(config.temperature != null ? { temperature: config.temperature } : {}),
				...(config.maxTokens != null ? { num_predict: config.maxTokens } : {}),
			},
		})

		const accumulatedToolCalls: ToolCall[] = []

		for await (const part of response) {
			const partToolCalls = extractToolCalls(
				part.message.tool_calls as
					| Array<{ function: { name: string; arguments: Record<string, unknown> } }>
					| undefined,
			)
			if (partToolCalls.length > 0) {
				accumulatedToolCalls.push(...partToolCalls)
			}

			yield {
				content: part.message.content,
				done: part.done,
				...(part.done && accumulatedToolCalls.length > 0
					? { toolCalls: accumulatedToolCalls }
					: {}),
			}
		}
	}

	async listModels(): Promise<ModelInfo[]> {
		const response = await this.client.list()

		return response.models.map((m) => ({
			id: m.name,
			name: m.name,
			provider: 'ollama',
			contextWindow: 0,
			supportsTools: true,
			supportsStreaming: true,
			costPer1kInput: 0,
			costPer1kOutput: 0,
		}))
	}
}
