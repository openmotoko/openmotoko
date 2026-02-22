import type {
	ChannelAdapter,
	ChannelAdapterConfig,
	InboundMessage,
	MessageHandler,
	OutboundMessage,
} from '@openmotoko/core'
import { nanoid } from '@openmotoko/core'
import { App } from '@slack/bolt'

export class SlackChannel implements ChannelAdapter {
	readonly id: string
	readonly type = 'slack' as const

	private app: App | null = null
	private handler: MessageHandler | null = null
	private running = false
	private botUserId = ''
	private nameCache = new Map<string, string>()

	constructor(id: string) {
		this.id = id
	}

	onMessage(handler: MessageHandler): void {
		this.handler = handler
	}

	async start(config: ChannelAdapterConfig): Promise<void> {
		if (this.running) return

		const botToken = config.botToken as string
		const appToken = config.appToken as string
		const signingSecret = config.signingSecret as string

		this.app = new App({
			token: botToken,
			signingSecret,
			socketMode: true,
			appToken,
		})

		try {
			const auth = await this.app.client.auth.test()
			this.botUserId = (auth.user_id as string) ?? ''
		} catch {
			this.botUserId = ''
		}

		this.app.message(async ({ message, client }) => {
			if (!this.handler) return
			if ('subtype' in message && message.subtype) return
			if (!('text' in message) || typeof message.text !== 'string') return
			if (!('user' in message) || typeof message.user !== 'string') return

			const text = message.text
			const userId = message.user
			const channelType = 'channel_type' in message ? String(message.channel_type) : ''
			const isGroup = channelType !== 'im'
			const threadTs =
				'thread_ts' in message ? (message.thread_ts as string | undefined) : undefined

			if (!this.nameCache.has(userId)) {
				try {
					const info = await client.users.info({ user: userId })
					this.nameCache.set(userId, info.user?.real_name || info.user?.name || userId)
				} catch {
					this.nameCache.set(userId, userId)
				}
			}

			const inbound: InboundMessage = {
				id: nanoid(),
				channelId: this.id,
				channelType: 'slack',
				chatId: message.channel,
				senderId: userId,
				senderName: this.nameCache.get(userId) ?? userId,
				content: text,
				isGroup,
				groupId: isGroup ? message.channel : undefined,
				isMention: this.botUserId ? text.includes(`<@${this.botUserId}>`) : false,
				replyToId: threadTs,
				timestamp: Math.floor(parseFloat(message.ts) * 1000),
			}

			this.handler(inbound)
		})

		await this.app.start()
		this.running = true
	}

	async stop(): Promise<void> {
		if (!this.running || !this.app) return
		this.running = false
		await this.app.stop()
		this.app = null
	}

	async sendMessage(msg: OutboundMessage): Promise<void> {
		if (!this.app) throw new Error('Slack app is not running')

		await this.app.client.chat.postMessage({
			channel: msg.chatId,
			text: msg.content,
			...(msg.replyToId ? { thread_ts: msg.replyToId } : {}),
		})
	}

	async sendTyping(_chatId: string): Promise<void> {}

	getMaxMessageLength(): number {
		return 40000
	}
}
