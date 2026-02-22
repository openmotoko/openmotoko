import type {
	ChannelAdapter,
	ChannelAdapterConfig,
	InboundMessage,
	MessageHandler,
	OutboundMessage,
} from '@openmotoko/core'
import { eventBus, nanoid, splitMessage } from '@openmotoko/core'
import { Bot, GrammyError, HttpError } from 'grammy'

export class TelegramChannel implements ChannelAdapter {
	readonly id: string
	readonly type = 'telegram' as const

	private bot: Bot | null = null
	private handler: MessageHandler | null = null
	private running = false

	constructor(id: string) {
		this.id = id
	}

	onMessage(handler: MessageHandler): void {
		this.handler = handler
	}

	async start(config: ChannelAdapterConfig): Promise<void> {
		if (this.running) return

		const token = config.token as string
		const allowedChatIds = (config.allowedChatIds as string[] | undefined) ?? []

		this.bot = new Bot(token)

		this.bot.catch(({ error }) => {
			if (error instanceof GrammyError) {
				eventBus.emit('channel:message', {
					type: 'channel:message',
					channelId: this.id,
					channelType: this.type,
					content: `Telegram API error: ${error.description}`,
				})
			} else if (error instanceof HttpError) {
				eventBus.emit('channel:message', {
					type: 'channel:message',
					channelId: this.id,
					channelType: this.type,
					content: `Network error: ${error.message}`,
				})
			}
		})

		this.bot.on('message:text', (ctx) => {
			const chatId = String(ctx.chat.id)

			if (allowedChatIds.length && !allowedChatIds.includes(chatId)) {
				return
			}

			const isGroup = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup'
			const botUsername = this.bot?.botInfo?.username
			const isMention =
				isGroup && botUsername
					? ctx.message.text.toLowerCase().includes(`@${botUsername.toLowerCase()}`)
					: false

			const msg: InboundMessage = {
				id: nanoid(),
				channelId: this.id,
				channelType: this.type,
				chatId,
				senderId: String(ctx.from.id),
				senderName: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' '),
				content: ctx.message.text,
				isGroup,
				groupId: isGroup ? chatId : undefined,
				isMention,
				replyToId: ctx.message.reply_to_message
					? String(ctx.message.reply_to_message.message_id)
					: undefined,
				timestamp: ctx.message.date * 1000,
			}

			this.handler?.(msg)

			eventBus.emit('channel:message', {
				type: 'channel:message',
				channelId: this.id,
				channelType: this.type,
				content: msg.content,
			})
		})

		this.running = true
		this.bot.start({
			drop_pending_updates: true,
			allowed_updates: ['message'],
		})
	}

	async stop(): Promise<void> {
		if (!this.running || !this.bot) return
		this.running = false
		this.bot.stop()
		this.bot = null
	}

	async sendMessage(msg: OutboundMessage): Promise<void> {
		if (!this.bot) throw new Error('Bot is not running')

		const chunks = splitMessage(msg.content, 4096)
		for (const chunk of chunks) {
			await this.bot.api.sendMessage(Number(msg.chatId), chunk, {
				reply_to_message_id: msg.replyToId ? Number(msg.replyToId) : undefined,
			})
		}
	}

	async sendTyping(chatId: string): Promise<void> {
		if (!this.bot) return
		await this.bot.api.sendChatAction(Number(chatId), 'typing')
	}

	getMaxMessageLength(): number {
		return 4096
	}
}
