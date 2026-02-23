import type {
	ChannelAdapter,
	ChannelAdapterConfig,
	InboundMessage,
	MessageHandler,
	OutboundMessage,
} from '@openmotoko/core'
import { nanoid } from '@openmotoko/core'

const FEISHU_API = 'https://open.feishu.cn/open-apis'

export class FeishuChannel implements ChannelAdapter {
	readonly id: string
	readonly type = 'feishu' as const

	private handler: MessageHandler | null = null
	private running = false
	private appId = ''
	private appSecret = ''
	private tenantAccessToken = ''
	private tokenRefreshTimer: ReturnType<typeof setInterval> | null = null
	private pollTimer: ReturnType<typeof setInterval> | null = null

	constructor(id: string) {
		this.id = id
	}

	onMessage(handler: MessageHandler): void {
		this.handler = handler
	}

	async start(config: ChannelAdapterConfig): Promise<void> {
		if (this.running) return

		this.appId = config.appId as string
		this.appSecret = config.appSecret as string

		await this.refreshToken()
		this.tokenRefreshTimer = setInterval(() => this.refreshToken(), 90 * 60 * 1000)
		this.running = true
	}

	private async refreshToken(): Promise<void> {
		const response = await fetch(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				app_id: this.appId,
				app_secret: this.appSecret,
			}),
		})
		const data = (await response.json()) as { tenant_access_token: string }
		this.tenantAccessToken = data.tenant_access_token
	}

	async stop(): Promise<void> {
		if (!this.running) return
		this.running = false
		if (this.tokenRefreshTimer) clearInterval(this.tokenRefreshTimer)
		if (this.pollTimer) clearInterval(this.pollTimer)
		this.tokenRefreshTimer = null
		this.pollTimer = null
	}

	handleWebhookEvent(event: {
		message_id: string
		chat_id: string
		chat_type: string
		sender: { sender_id: { open_id: string }; sender_type: string }
		content: string
		create_time: string
		mentions?: { key: string; id: { open_id: string } }[]
	}): void {
		if (!this.handler) return

		let textContent = ''
		try {
			const parsed = JSON.parse(event.content) as { text?: string }
			textContent = parsed.text ?? ''
		} catch {
			textContent = event.content
		}

		const isGroup = event.chat_type === 'group'
		const hasMention = (event.mentions?.length ?? 0) > 0

		const inbound: InboundMessage = {
			id: nanoid(),
			channelId: this.id,
			channelType: 'feishu',
			chatId: event.chat_id,
			senderId: event.sender.sender_id.open_id,
			senderName: event.sender.sender_id.open_id,
			content: textContent,
			isGroup,
			groupId: isGroup ? event.chat_id : undefined,
			isMention: hasMention,
			timestamp: parseInt(event.create_time, 10),
		}

		this.handler(inbound)
	}

	async sendMessage(msg: OutboundMessage): Promise<void> {
		if (!this.tenantAccessToken) throw new Error('Feishu client is not authenticated')

		await fetch(`${FEISHU_API}/im/v1/messages?receive_id_type=chat_id`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.tenantAccessToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				receive_id: msg.chatId,
				msg_type: 'text',
				content: JSON.stringify({ text: msg.content }),
			}),
		})
	}

	async sendTyping(_chatId: string): Promise<void> {}

	getMaxMessageLength(): number {
		return 4096
	}
}
