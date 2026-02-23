import type {
	ChannelAdapter,
	ChannelAdapterConfig,
	InboundMessage,
	MediaAttachment,
	MessageHandler,
	OutboundMessage,
} from '@openmotoko/core'
import { classifyMimeType, eventBus, splitMessage } from '@openmotoko/core'
import { Client, Events, GatewayIntentBits, Partials } from 'discord.js'

export class DiscordChannel implements ChannelAdapter {
	readonly id: string
	readonly type = 'discord' as const

	private client: Client | null = null
	private handler: MessageHandler | null = null
	private running = false
	private allowedChannelIds: string[] = []

	constructor(id: string) {
		this.id = id
	}

	onMessage(handler: MessageHandler): void {
		this.handler = handler
	}

	async start(config: ChannelAdapterConfig): Promise<void> {
		if (this.running) return

		const token = config.token as string
		if (!token) throw new Error('Discord bot token is required')

		this.allowedChannelIds = (config.allowedChannelIds as string[] | undefined) ?? []

		this.client = new Client({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.DirectMessages,
				GatewayIntentBits.MessageContent,
			],
			partials: [Partials.Channel],
		})

		this.client.on(Events.MessageCreate, async (message) => {
			if (message.author.bot) return

			if (
				this.allowedChannelIds.length > 0 &&
				!this.allowedChannelIds.includes(message.channelId)
			) {
				return
			}

			const isGroup = message.guild !== null
			const isMention = this.client?.user ? message.mentions.users.has(this.client.user.id) : false

			const attachments: MediaAttachment[] = [...message.attachments.values()].map((a) => ({
				type: classifyMimeType(a.contentType ?? 'application/octet-stream'),
				url: a.url,
				mimeType: a.contentType ?? 'application/octet-stream',
				filename: a.name ?? undefined,
				size: a.size,
			}))

			const inbound: InboundMessage = {
				id: message.id,
				channelId: this.id,
				channelType: 'discord',
				chatId: message.channelId,
				senderId: message.author.id,
				senderName:
					message.member?.displayName ?? message.author.displayName ?? message.author.username,
				content: message.content,
				isGroup,
				groupId: message.guildId ?? undefined,
				isMention,
				replyToId: message.reference?.messageId ?? undefined,
				attachments: attachments.length > 0 ? attachments : undefined,
				timestamp: message.createdTimestamp,
			}

			this.handler?.(inbound)

			eventBus.emit('channel:message', {
				type: 'channel:message',
				channelId: this.id,
				channelType: this.type,
				content: inbound.content,
			})
		})

		this.client.on(Events.Error, (err) => {
			eventBus.emit('channel:message', {
				type: 'channel:message',
				channelId: this.id,
				channelType: this.type,
				content: `Discord error: ${err.message}`,
			})
		})

		this.client.on(Events.ShardError, (err) => {
			eventBus.emit('channel:message', {
				type: 'channel:message',
				channelId: this.id,
				channelType: this.type,
				content: `Discord shard error: ${err.message}`,
			})
		})

		this.client.once(Events.ClientReady, () => {
			eventBus.emit('channel:message', {
				type: 'channel:message',
				channelId: this.id,
				channelType: this.type,
				content: 'Discord connected',
			})
		})

		await this.client.login(token)
		this.running = true
	}

	async stop(): Promise<void> {
		if (!this.running || !this.client) return
		this.running = false
		await this.client.destroy()
		this.client = null
	}

	async sendMessage(msg: OutboundMessage): Promise<void> {
		if (!this.client) throw new Error('Discord is not connected')

		const channel = await this.client.channels.fetch(msg.chatId)
		if (!channel?.isTextBased()) {
			throw new Error('Channel not found or not text-based')
		}

		const chunks = splitMessage(msg.content, this.getMaxMessageLength())
		for (let i = 0; i < chunks.length; i++) {
			const payload: Record<string, unknown> = { content: chunks[i] }
			if (msg.replyToId && i === 0) {
				payload.reply = { messageReference: msg.replyToId }
			}
			await (channel as unknown as { send: (p: unknown) => Promise<void> }).send(payload)
		}

		if (msg.attachments?.length) {
			const files = msg.attachments
				.filter((a) => a.buffer || a.url)
				.map((a) => ({
					attachment: (a.buffer ?? a.url) as string | Buffer,
					name: a.filename ?? 'file',
				}))
			if (files.length > 0) {
				await (channel as unknown as { send: (p: unknown) => Promise<void> }).send({ files })
			}
		}
	}

	async sendTyping(chatId: string): Promise<void> {
		if (!this.client) return
		const channel = await this.client.channels.fetch(chatId)
		if (channel?.isTextBased()) {
			await (channel as unknown as { sendTyping: () => Promise<void> }).sendTyping()
		}
	}

	getMaxMessageLength(): number {
		return 2000
	}
}
