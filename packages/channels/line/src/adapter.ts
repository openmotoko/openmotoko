import type {
	ChannelAdapter,
	ChannelAdapterConfig,
	InboundMessage,
	MessageHandler,
	OutboundMessage,
} from '@openmotoko/core'
import { nanoid } from '@openmotoko/core'

const LINE_API = 'https://api.line.me/v2/bot'

export class LineChannel implements ChannelAdapter {
	readonly id: string
	readonly type = 'line' as const

	private handler: MessageHandler | null = null
	private running = false
	private channelAccessToken = ''

	constructor(id: string) {
		this.id = id
	}

	onMessage(handler: MessageHandler): void {
		this.handler = handler
	}

	async start(config: ChannelAdapterConfig): Promise<void> {
		if (this.running) return

		this.channelAccessToken = config.channelAccessToken as string
		this.running = true
	}

	handleWebhookEvents(
		events: {
			type: string
			replyToken?: string
			source: { type: string; userId?: string; groupId?: string; roomId?: string }
			message?: { id: string; type: string; text?: string }
			timestamp: number
		}[],
	): void {
		if (!this.handler) return

		for (const event of events) {
			if (event.type !== 'message') continue
			if (event.message?.type !== 'text') continue

			const isGroup = event.source.type === 'group' || event.source.type === 'room'
			const chatId = event.source.groupId ?? event.source.roomId ?? event.source.userId ?? ''

			const inbound: InboundMessage = {
				id: nanoid(),
				channelId: this.id,
				channelType: 'line',
				chatId,
				senderId: event.source.userId ?? '',
				senderName: event.source.userId ?? '',
				content: event.message.text ?? '',
				isGroup,
				groupId: isGroup ? chatId : undefined,
				timestamp: event.timestamp,
			}

			this.handler(inbound)
		}
	}

	async stop(): Promise<void> {
		if (!this.running) return
		this.running = false
	}

	async sendMessage(msg: OutboundMessage): Promise<void> {
		if (!this.channelAccessToken) throw new Error('LINE client is not configured')

		await fetch(`${LINE_API}/message/push`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.channelAccessToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				to: msg.chatId,
				messages: [{ type: 'text', text: msg.content }],
			}),
		})
	}

	async sendTyping(_chatId: string): Promise<void> {}

	getMaxMessageLength(): number {
		return 5000
	}
}
