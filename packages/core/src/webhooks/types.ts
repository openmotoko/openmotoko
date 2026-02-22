export interface Webhook {
	id: string
	name: string
	secret: string
	enabled: boolean
	targetConversationId: string | null
	handler: string
	lastTriggeredAt: number | null
	createdAt: number
}

export interface WebhookPayload {
	webhookId: string
	headers: Record<string, string>
	body: unknown
	receivedAt: number
}

export interface WebhookCreateParams {
	name: string
	handler?: string
	targetConversationId?: string
}

export type WebhookHandler = (webhook: Webhook, payload: WebhookPayload) => Promise<void>
