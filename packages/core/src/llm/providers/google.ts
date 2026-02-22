import {
	type Content,
	type FunctionDeclaration,
	type FunctionDeclarationSchema,
	type GenerateContentResult,
	GoogleGenerativeAI,
	type Part,
} from '@google/generative-ai'
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
	'gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
	'gemini-2.0-pro': { input: 0.00125, output: 0.005 },
	'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
	'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
}

const KNOWN_MODELS: ModelInfo[] = [
	{
		id: 'gemini-2.0-flash',
		name: 'Gemini 2.0 Flash',
		provider: 'google',
		contextWindow: 1_048_576,
		supportsTools: true,
		supportsStreaming: true,
		costPer1kInput: 0.0001,
		costPer1kOutput: 0.0004,
	},
	{
		id: 'gemini-2.0-pro',
		name: 'Gemini 2.0 Pro',
		provider: 'google',
		contextWindow: 2_097_152,
		supportsTools: true,
		supportsStreaming: true,
		costPer1kInput: 0.00125,
		costPer1kOutput: 0.005,
	},
	{
		id: 'gemini-1.5-pro',
		name: 'Gemini 1.5 Pro',
		provider: 'google',
		contextWindow: 2_097_152,
		supportsTools: true,
		supportsStreaming: true,
		costPer1kInput: 0.00125,
		costPer1kOutput: 0.005,
	},
	{
		id: 'gemini-1.5-flash',
		name: 'Gemini 1.5 Flash',
		provider: 'google',
		contextWindow: 1_048_576,
		supportsTools: true,
		supportsStreaming: true,
		costPer1kInput: 0.000075,
		costPer1kOutput: 0.0003,
	},
]

function toGeminiContents(messages: LLMMessage[]): Content[] {
	const contents: Content[] = []

	for (const msg of messages) {
		if (msg.role === 'system') continue

		if (msg.role === 'tool' && msg.toolResults) {
			const parts: Part[] = msg.toolResults.map((tr) => ({
				functionResponse: {
					name: tr.callId,
					response:
						typeof tr.output === 'object' && tr.output !== null
							? (tr.output as Record<string, unknown>)
							: { result: tr.output },
				},
			}))
			contents.push({ role: 'function', parts })
			continue
		}

		if (msg.role === 'assistant' && msg.toolCalls?.length) {
			const parts: Part[] = []
			if (msg.content) {
				parts.push({ text: msg.content })
			}
			for (const tc of msg.toolCalls) {
				parts.push({
					functionCall: {
						name: tc.name,
						args: (tc.input ?? {}) as Record<string, unknown>,
					},
				})
			}
			contents.push({ role: 'model', parts })
			continue
		}

		contents.push({
			role: msg.role === 'assistant' ? 'model' : 'user',
			parts: [{ text: msg.content }],
		})
	}

	return contents
}

function toGeminiTools(tools: ToolDefinition[]): FunctionDeclaration[] {
	return tools.map((t) => ({
		name: t.name,
		description: t.description,
		parameters: t.inputSchema as unknown as FunctionDeclarationSchema,
	}))
}

function extractToolCalls(result: GenerateContentResult): ToolCall[] {
	const calls: ToolCall[] = []
	const parts = result.response.candidates?.[0]?.content?.parts ?? []
	let idx = 0
	for (const part of parts) {
		if (part.functionCall) {
			calls.push({
				id: `call_${idx++}`,
				name: part.functionCall.name,
				input: part.functionCall.args,
			})
		}
	}
	return calls
}

function extractText(result: GenerateContentResult): string {
	const parts = result.response.candidates?.[0]?.content?.parts ?? []
	return parts
		.filter((p) => 'text' in p && typeof p.text === 'string')
		.map((p) => (p as { text: string }).text)
		.join('')
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
	const pricing = MODEL_PRICING[model]
	if (!pricing) return 0
	return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output
}

export class GoogleProvider implements LLMProvider {
	readonly id = 'google'
	readonly name = 'Google'
	private client: GoogleGenerativeAI

	constructor(apiKey: string) {
		this.client = new GoogleGenerativeAI(apiKey)
	}

	async chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
		const systemInstruction =
			config.systemPrompt ?? messages.find((m) => m.role === 'system')?.content

		const model = this.client.getGenerativeModel({
			model: config.model,
			...(systemInstruction ? { systemInstruction } : {}),
			...(config.tools?.length
				? { tools: [{ functionDeclarations: toGeminiTools(config.tools) }] }
				: {}),
			generationConfig: {
				...(config.temperature != null ? { temperature: config.temperature } : {}),
				...(config.maxTokens != null ? { maxOutputTokens: config.maxTokens } : {}),
			},
		})

		const result = await model.generateContent({
			contents: toGeminiContents(messages),
		})

		const usage = result.response.usageMetadata
		const inputTokens = usage?.promptTokenCount ?? 0
		const outputTokens = usage?.candidatesTokenCount ?? 0

		return {
			content: extractText(result),
			toolCalls: extractToolCalls(result),
			usage: {
				inputTokens,
				outputTokens,
				cost: calculateCost(config.model, inputTokens, outputTokens),
			},
			model: config.model,
			provider: this.id,
		}
	}

	async *stream(messages: LLMMessage[], config: LLMConfig): AsyncIterableIterator<LLMChunk> {
		const systemInstruction =
			config.systemPrompt ?? messages.find((m) => m.role === 'system')?.content

		const model = this.client.getGenerativeModel({
			model: config.model,
			...(systemInstruction ? { systemInstruction } : {}),
			...(config.tools?.length
				? { tools: [{ functionDeclarations: toGeminiTools(config.tools) }] }
				: {}),
			generationConfig: {
				...(config.temperature != null ? { temperature: config.temperature } : {}),
				...(config.maxTokens != null ? { maxOutputTokens: config.maxTokens } : {}),
			},
		})

		const result = await model.generateContentStream({
			contents: toGeminiContents(messages),
		})

		let toolCallIdx = 0

		for await (const chunk of result.stream) {
			const parts = chunk.candidates?.[0]?.content?.parts ?? []

			for (const part of parts) {
				if ('text' in part && typeof part.text === 'string') {
					yield { content: part.text, done: false }
				} else if (part.functionCall) {
					yield {
						content: '',
						done: false,
						toolCall: {
							id: `call_${toolCallIdx++}`,
							name: part.functionCall.name,
							input: part.functionCall.args,
						},
					}
				}
			}
		}

		yield { content: '', done: true }
	}

	async listModels(): Promise<ModelInfo[]> {
		return KNOWN_MODELS
	}
}
