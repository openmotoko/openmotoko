export interface Session {
	id: string
	conversationId: string
	channelId: string | null
	senderId: string | null
	model: string | null
	systemPrompt: string | null
	tokenCount: number
	compactedAt: number | null
	createdAt: number
	updatedAt: number
}

export interface SessionCreateParams {
	conversationId: string
	channelId?: string
	senderId?: string
	model?: string
	systemPrompt?: string
}

export type SessionRouteKey = {
	channelId?: string
	senderId?: string
	groupId?: string
}

export interface CompactionResult {
	originalTokens: number
	compactedTokens: number
	summary: string
	messagesRemoved: number
}
