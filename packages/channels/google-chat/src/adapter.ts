import { readFile } from 'node:fs/promises'
import type {
	ChannelAdapter,
	ChannelAdapterConfig,
	InboundMessage,
	MessageHandler,
	OutboundMessage,
} from '@openmotoko/core'
import { nanoid } from '@openmotoko/core'
import { google } from 'googleapis'

interface GoogleChatEvent {
	type: string
	eventTime: string
	message?: {
		name: string
		sender: {
			name: string
			displayName: string
			type: string
		}
		createTime: string
		text: string
		thread?: {
			name: string
		}
		space: {
			name: string
			type: string
		}
		argumentText?: string
	}
}

export class GoogleChatChannel implements ChannelAdapter {
	readonly id: string
	readonly type = 'google-chat' as const

	private handler: MessageHandler | null = null
	private chatClient: ReturnType<typeof google.chat> | null = null
	private running = false

	constructor(id: string) {
		this.id = id
	}

	onMessage(handler: MessageHandler): void {
		this.handler = handler
	}

	async start(config: ChannelAdapterConfig): Promise<void> {
		if (this.running) return

		const keyPath = config.serviceAccountKeyPath as string
		const keyData = JSON.parse(await readFile(keyPath, 'utf-8')) as Record<string, unknown>

		const auth = new google.auth.GoogleAuth({
			credentials: keyData,
			scopes: ['https://www.googleapis.com/auth/chat.bot'],
		})

		this.chatClient = google.chat({ version: 'v1', auth })
		this.running = true
	}

	async stop(): Promise<void> {
		if (!this.running) return
		this.running = false
		this.chatClient = null
	}

	async sendMessage(msg: OutboundMessage): Promise<void> {
		if (!this.chatClient) {
			throw new Error('Google Chat client not initialized')
		}

		const requestBody: { text: string; thread?: { name: string } } = {
			text: msg.content,
		}

		if (msg.replyToId) {
			requestBody.thread = { name: msg.replyToId }
		}

		await this.chatClient.spaces.messages.create({
			parent: msg.chatId,
			requestBody,
		})
	}

	async sendTyping(_chatId: string): Promise<void> {}

	getMaxMessageLength(): number {
		return 4096
	}

	handleWebhook(body: unknown): void {
		if (!this.running || !this.handler) return

		const event = body as GoogleChatEvent
		if (event.type !== 'MESSAGE' || !event.message) return

		const space = event.message.space
		const isGroup = space.type === 'ROOM'

		const msg: InboundMessage = {
			id: nanoid(),
			channelId: this.id,
			channelType: 'google-chat',
			chatId: space.name,
			senderId: event.message.sender.name,
			senderName: event.message.sender.displayName,
			content: event.message.argumentText ?? event.message.text,
			isGroup,
			groupId: isGroup ? space.name : undefined,
			replyToId: event.message.thread?.name,
			timestamp: new Date(event.message.createTime).getTime(),
		}

		this.handler(msg)
	}
}
