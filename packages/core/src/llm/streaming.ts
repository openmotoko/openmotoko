import type { LLMChunk, LLMResponse, ToolCall } from './types.js'

export async function collectStream(
	stream: AsyncIterableIterator<LLMChunk>,
	model: string,
	provider: string,
): Promise<LLMResponse> {
	const textParts: string[] = []
	const toolCalls: ToolCall[] = []
	let inputTokens = 0
	let outputTokens = 0
	let cost = 0

	for await (const chunk of stream) {
		if (chunk.content) {
			textParts.push(chunk.content)
		}
		if (chunk.toolCall) {
			toolCalls.push(chunk.toolCall)
		}
		if (chunk.usage) {
			inputTokens = chunk.usage.inputTokens ?? inputTokens
			outputTokens = chunk.usage.outputTokens ?? outputTokens
			cost = chunk.usage.cost ?? cost
		}
	}

	return {
		content: textParts.join(''),
		toolCalls,
		usage: { inputTokens, outputTokens, cost },
		model,
		provider,
	}
}

export async function* tapStream(
	stream: AsyncIterableIterator<LLMChunk>,
	onChunk: (chunk: LLMChunk) => void,
): AsyncIterableIterator<LLMChunk> {
	for await (const chunk of stream) {
		onChunk(chunk)
		yield chunk
	}
}

export async function* mapStream(
	stream: AsyncIterableIterator<LLMChunk>,
	transform: (chunk: LLMChunk) => LLMChunk,
): AsyncIterableIterator<LLMChunk> {
	for await (const chunk of stream) {
		yield transform(chunk)
	}
}

export async function* mergeStreams(
	...streams: AsyncIterableIterator<LLMChunk>[]
): AsyncIterableIterator<LLMChunk> {
	for (const stream of streams) {
		for await (const chunk of stream) {
			yield chunk
		}
	}
}

export async function* textOnlyStream(
	stream: AsyncIterableIterator<LLMChunk>,
): AsyncIterableIterator<string> {
	for await (const chunk of stream) {
		if (chunk.content) {
			yield chunk.content
		}
	}
}
