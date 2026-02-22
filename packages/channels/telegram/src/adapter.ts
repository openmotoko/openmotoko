import { eventBus } from '@openmotoko/core'
import { Bot, GrammyError, HttpError } from 'grammy'
import type { ChannelAdapter, ChannelConfig, IncomingMessage, MessageHandler } from './types.js'

export class TelegramChannel implements ChannelAdapter {
	readonly id: string
	readonly type = 'telegram'

	private bot: Bot | null = null
	private handler: MessageHandler | null = null
	private config: ChannelConfig | null = null
	private chatIdMap = new Map<string, string>()
	private running = false

	constructor(id: string) {
		this.id = id
	}

	onMessage(handler: MessageHandler): void {
		this.handler = handler
	}

	async start(config: ChannelConfig): Promise<void> {
		if (this.running) return

		this.config = config
		this.bot = new Bot(config.token)

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

			if (this.config?.allowedChatIds?.length && !this.config.allowedChatIds.includes(chatId)) {
				return
			}

			const msg: IncomingMessage = {
				chatId,
				senderId: String(ctx.from.id),
				senderName: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' '),
				content: ctx.message.text,
				channel: this.type,
				timestamp: ctx.message.date * 1000,
			}

			if (!this.chatIdMap.has(chatId)) {
				this.chatIdMap.set(chatId, `tg_${chatId}`)
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

	async sendMessage(chatId: string, content: string): Promise<void> {
		if (!this.bot) {
			throw new Error('Bot is not running')
		}
		await this.bot.api.sendMessage(Number(chatId), content)
	}

	getConversationId(chatId: string): string | undefined {
		return this.chatIdMap.get(chatId)
	}

	setConversationId(chatId: string, conversationId: string): void {
		this.chatIdMap.set(chatId, conversationId)
	}
}
