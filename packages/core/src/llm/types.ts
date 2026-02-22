export interface LLMProvider {
	id: string
	name: string
	chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse>
	stream(messages: LLMMessage[], config: LLMConfig): AsyncIterableIterator<LLMChunk>
	listModels(): Promise<ModelInfo[]>
}

export interface LLMMessage {
	role: 'system' | 'user' | 'assistant' | 'tool'
	content: string
	toolCalls?: ToolCall[]
	toolResults?: ToolResult[]
}

export interface LLMConfig {
	model: string
	temperature?: number
	maxTokens?: number
	tools?: ToolDefinition[]
	systemPrompt?: string
}

export interface LLMResponse {
	content: string
	toolCalls: ToolCall[]
	usage: { inputTokens: number; outputTokens: number; cost: number }
	model: string
	provider: string
}

export interface LLMChunk {
	content: string
	done: boolean
	toolCall?: ToolCall
}

export interface ToolCall {
	id: string
	name: string
	input: unknown
}

export interface ToolResult {
	callId: string
	output: unknown
	isError?: boolean
}

export interface ToolDefinition {
	name: string
	description: string
	inputSchema: Record<string, unknown>
}

export interface ModelInfo {
	id: string
	name: string
	provider: string
	contextWindow: number
	supportsTools: boolean
	supportsStreaming: boolean
	costPer1kInput: number
	costPer1kOutput: number
}

export type ModelAlias = 'fast' | 'smart' | 'balanced'
