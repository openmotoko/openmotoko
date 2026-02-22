import type {
	ChannelAdapter,
	ChannelAdapterConfig,
	InboundMessage,
	MessageHandler,
	OutboundMessage,
} from '@openmotoko/core'
import { nanoid } from '@openmotoko/core'
import {
	ActivityTypes,
	type Request as BotRequest,
	type Response as BotResponse,
	CloudAdapter,
	ConfigurationBotFrameworkAuthentication,
	type TurnContext,
} from 'botbuilder'

interface TeamsConfig extends ChannelAdapterConfig {
	appId: string
	appPassword: string
	tenantId?: string
}

export class TeamsChannel implements ChannelAdapter {
	readonly id: string
	readonly type = 'teams'

	private adapter: CloudAdapter | null = null
	private handler: MessageHandler | null = null
	private contextRefs = new Map<string, TurnContext>()
	private running = false

	constructor(id: string) {
		this.id = id
	}

	onMessage(handler: MessageHandler): void {
		this.handler = handler
	}

	async start(config: ChannelAdapterConfig): Promise<void> {
		if (this.running) return

		const cfg = config as TeamsConfig

		const auth = new ConfigurationBotFrameworkAuthentication({
			MicrosoftAppId: cfg.appId,
			MicrosoftAppPassword: cfg.appPassword,
			MicrosoftAppTenantId: cfg.tenantId ?? '',
		})

		this.adapter = new CloudAdapter(auth)

		this.adapter.onTurnError = async (context: TurnContext, error: Error) => {
			await context.sendActivity(`Error: ${error.message}`)
		}

		this.running = true
	}

	async stop(): Promise<void> {
		if (!this.running) return
		this.running = false
		this.contextRefs.clear()
		this.adapter = null
	}

	async handleActivity(req: BotRequest, res: BotResponse): Promise<void> {
		if (!this.adapter) {
			throw new Error('Teams adapter not started')
		}

		await this.adapter.process(req, res, async (context: TurnContext) => {
			if (context.activity.type === ActivityTypes.Message) {
				this.contextRefs.set(context.activity.conversation.id, context)
				await this.processMessage(context)
			}
		})
	}

	async sendMessage(msg: OutboundMessage): Promise<void> {
		const ref = this.contextRefs.get(msg.chatId)
		if (!ref) {
			throw new Error(`No active context for chat ${msg.chatId}`)
		}

		await ref.sendActivity({
			type: ActivityTypes.Message,
			text: msg.content,
			...(msg.replyToId ? { replyToId: msg.replyToId } : {}),
		})
	}

	async sendTyping(chatId: string): Promise<void> {
		const ref = this.contextRefs.get(chatId)
		if (!ref) return

		await ref.sendActivity({ type: ActivityTypes.Typing })
	}

	getMaxMessageLength(): number {
		return 28000
	}

	private async processMessage(context: TurnContext): Promise<void> {
		if (!this.handler) return

		const activity = context.activity
		const conversation = activity.conversation
		const conversationType = conversation?.conversationType ?? ''
		const isGroup =
			conversation?.isGroup === true ||
			conversationType === 'groupChat' ||
			conversationType === 'channel'

		const msg: InboundMessage = {
			id: activity.id ?? nanoid(),
			channelId: this.id,
			channelType: this.type,
			chatId: conversation.id,
			senderId: activity.from?.id ?? 'unknown',
			senderName: activity.from?.name ?? 'Unknown',
			content: activity.text ?? '',
			isGroup,
			groupId: isGroup ? conversation.id : undefined,
			isMention: this.checkMention(activity),
			replyToId: activity.replyToId ?? undefined,
			timestamp: activity.timestamp
				? new Date(activity.timestamp as unknown as string).getTime()
				: Date.now(),
		}

		await this.handler(msg)
	}

	private checkMention(activity: {
		entities?: Array<{ type?: string; mentioned?: { role?: string } }>
	}): boolean {
		if (!activity.entities) return false
		return activity.entities.some((e) => e.type === 'mention' && e.mentioned?.role === 'bot')
	}
}
