export interface IncomingMessage {
	chatId: string
	senderId: string
	senderName: string
	content: string
	channel: string
	timestamp: number
}

export interface ChannelConfig {
	token: string
	allowedChatIds?: string[]
	webhookUrl?: string
	webhookPort?: number
	pollingTimeout?: number
}

export type MessageHandler = (msg: IncomingMessage) => void

export interface ChannelAdapter {
	id: string
	type: string
	start(config: ChannelConfig): Promise<void>
	stop(): Promise<void>
	sendMessage(chatId: string, content: string): Promise<void>
	onMessage(handler: MessageHandler): void
}
