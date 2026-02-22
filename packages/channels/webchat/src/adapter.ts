import type {
	ChannelAdapter,
	ChannelAdapterConfig,
	InboundMessage,
	MessageHandler,
	OutboundMessage,
} from '@openmotoko/core'
import { nanoid } from '@openmotoko/core'

interface SessionState {
	queue: Array<{ type: 'message'; content: string; replyToId?: string } | { type: 'typing' }>
}

export class WebChatChannel implements ChannelAdapter {
	readonly id: string
	readonly type = 'webchat'

	private handler: MessageHandler | null = null
	private sessions = new Map<string, SessionState>()

	constructor(id: string) {
		this.id = id
	}

	onMessage(handler: MessageHandler): void {
		this.handler = handler
	}

	async start(_config: ChannelAdapterConfig): Promise<void> {}

	async stop(): Promise<void> {
		this.sessions.clear()
	}

	async sendMessage(msg: OutboundMessage): Promise<void> {
		const session = this.sessions.get(msg.chatId)
		if (!session) return

		session.queue.push({
			type: 'message',
			content: msg.content,
			replyToId: msg.replyToId,
		})
	}

	async sendTyping(chatId: string): Promise<void> {
		const session = this.sessions.get(chatId)
		if (!session) return

		session.queue.push({ type: 'typing' })
	}

	getMaxMessageLength(): number {
		return 100000
	}

	registerSession(sessionId: string): void {
		if (!this.sessions.has(sessionId)) {
			this.sessions.set(sessionId, { queue: [] })
		}
	}

	removeSession(sessionId: string): void {
		this.sessions.delete(sessionId)
	}

	getMessages(sessionId: string): SessionState['queue'] {
		const session = this.sessions.get(sessionId)
		if (!session) return []

		const messages = [...session.queue]
		session.queue.length = 0
		return messages
	}

	async handleIncoming(sessionId: string, senderName: string, content: string): Promise<void> {
		if (!this.handler) return

		this.registerSession(sessionId)

		const msg: InboundMessage = {
			id: nanoid(),
			channelId: this.id,
			channelType: this.type,
			chatId: sessionId,
			senderId: sessionId,
			senderName,
			content,
			isGroup: false,
			timestamp: Date.now(),
		}

		await this.handler(msg)
	}
}
