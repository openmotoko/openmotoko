import type {
	ChannelAdapter,
	ChannelAdapterConfig,
	InboundMessage,
	MessageHandler,
	OutboundMessage,
} from '@openmotoko/core'
import { nanoid } from '@openmotoko/core'

interface BlueBubblesMessage {
	guid: string
	text: string | null
	dateCreated: number
	isFromMe: boolean
	handle: {
		address: string
		firstName?: string
		lastName?: string
	} | null
	chats: Array<{
		chatIdentifier: string
		isGroup: boolean
		guid: string
	}>
	associatedMessageGuid?: string
}

interface BlueBubblesResponse {
	status: number
	data: BlueBubblesMessage[]
}

export class IMessageChannel implements ChannelAdapter {
	readonly id: string
	readonly type = 'imessage' as const

	private handler: MessageHandler | null = null
	private pollTimer: ReturnType<typeof setInterval> | null = null
	private lastTimestamp = 0
	private serverUrl = ''
	private password = ''
	private running = false

	constructor(id: string) {
		this.id = id
	}

	onMessage(handler: MessageHandler): void {
		this.handler = handler
	}

	async start(config: ChannelAdapterConfig): Promise<void> {
		if (this.running) return

		this.serverUrl = (config.serverUrl as string).replace(/\/$/, '')
		this.password = config.password as string
		const pollInterval = (config.pollInterval as number) ?? 5000

		this.lastTimestamp = Date.now()
		this.running = true

		this.pollTimer = setInterval(() => {
			this.poll().catch(() => {})
		}, pollInterval)
	}

	async stop(): Promise<void> {
		if (!this.running) return
		this.running = false
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			this.pollTimer = null
		}
	}

	async sendMessage(msg: OutboundMessage): Promise<void> {
		const url = `${this.serverUrl}/api/v1/message/text?password=${encodeURIComponent(this.password)}`
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chatGuid: msg.chatId,
				message: msg.content,
			}),
		})
		if (!res.ok) {
			throw new Error(`BlueBubbles send failed: ${res.status}`)
		}
	}

	async sendTyping(_chatId: string): Promise<void> {}

	getMaxMessageLength(): number {
		return 20000
	}

	private async poll(): Promise<void> {
		if (!this.running) return

		const params = new URLSearchParams({
			after: String(this.lastTimestamp),
			sort: 'ASC',
			password: this.password,
		})
		const url = `${this.serverUrl}/api/v1/message?${params.toString()}`

		const res = await fetch(url)
		if (!res.ok) return

		const body = (await res.json()) as BlueBubblesResponse
		if (!body.data?.length) return

		for (const raw of body.data) {
			if (raw.isFromMe || !raw.text) continue

			const chat = raw.chats[0]
			if (!chat) continue

			const senderName =
				[raw.handle?.firstName, raw.handle?.lastName].filter(Boolean).join(' ') ||
				raw.handle?.address ||
				'Unknown'

			const msg: InboundMessage = {
				id: nanoid(),
				channelId: this.id,
				channelType: 'imessage',
				chatId: chat.guid,
				senderId: raw.handle?.address ?? 'unknown',
				senderName,
				content: raw.text,
				isGroup: chat.isGroup,
				groupId: chat.isGroup ? chat.chatIdentifier : undefined,
				replyToId: raw.associatedMessageGuid ?? undefined,
				timestamp: raw.dateCreated,
			}

			if (raw.dateCreated > this.lastTimestamp) {
				this.lastTimestamp = raw.dateCreated
			}

			this.handler?.(msg)
		}
	}
}
