import type {
	ChannelAdapter,
	ChannelAdapterConfig,
	InboundMessage,
	MessageHandler,
	OutboundMessage,
} from '@openmotoko/core'
import { nanoid } from '@openmotoko/core'

const MAX_RECONNECT_ATTEMPTS = 5
const BASE_DELAY_MS = 1000

export class MattermostChannel implements ChannelAdapter {
	readonly id: string
	readonly type = 'mattermost' as const

	private handler: MessageHandler | null = null
	private running = false
	private ws: WebSocket | null = null
	private baseUrl = ''
	private token = ''
	private botUserId = ''
	private reconnectAttempts = 0
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null

	constructor(id: string) {
		this.id = id
	}

	onMessage(handler: MessageHandler): void {
		this.handler = handler
	}

	async start(config: ChannelAdapterConfig): Promise<void> {
		if (this.running) return

		this.baseUrl = config.url as string
		this.token = config.token as string

		const meResponse = await fetch(`${this.baseUrl}/api/v4/users/me`, {
			headers: { Authorization: `Bearer ${this.token}` },
		})
		const me = (await meResponse.json()) as { id: string }
		this.botUserId = me.id

		this.connectWebSocket()
		this.running = true
	}

	private connectWebSocket(): void {
		const wsUrl = `${this.baseUrl.replace(/^http/, 'ws')}/api/v4/websocket`
		this.ws = new WebSocket(wsUrl)

		this.ws.addEventListener('open', () => {
			this.reconnectAttempts = 0
			this.ws?.send(
				JSON.stringify({
					seq: 1,
					action: 'authentication_challenge',
					data: { token: this.token },
				}),
			)
		})

		this.ws.addEventListener('message', (ev) => {
			this.handleWsMessage(String(ev.data))
		})

		this.ws.addEventListener('error', () => {})

		this.ws.addEventListener('close', () => {
			this.ws = null
			if (this.running) {
				this.scheduleReconnect()
			}
		})
	}

	private scheduleReconnect(): void {
		if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
			this.running = false
			return
		}

		const delay = BASE_DELAY_MS * 2 ** this.reconnectAttempts
		this.reconnectAttempts++

		this.reconnectTimer = setTimeout(() => {
			if (!this.running) return
			this.connectWebSocket()
		}, delay)
	}

	private handleWsMessage(raw: string): void {
		if (!this.handler) return

		let payload: {
			event?: string
			data?: {
				post?: string
				channel_type?: string
			}
		}
		try {
			payload = JSON.parse(raw)
		} catch {
			return
		}

		if (payload.event !== 'posted') return

		let post: {
			id: string
			user_id: string
			channel_id: string
			message: string
			root_id?: string
			create_at: number
			props?: { username?: string }
		}
		try {
			post = JSON.parse(payload.data?.post ?? '{}')
		} catch {
			return
		}

		if (post.user_id === this.botUserId) return

		const channelType = payload.data?.channel_type ?? ''
		const isGroup = channelType !== 'D'

		const inbound: InboundMessage = {
			id: nanoid(),
			channelId: this.id,
			channelType: 'mattermost',
			chatId: post.channel_id,
			senderId: post.user_id,
			senderName: post.props?.username ?? post.user_id,
			content: post.message,
			isGroup,
			groupId: isGroup ? post.channel_id : undefined,
			replyToId: post.root_id || undefined,
			timestamp: post.create_at,
		}

		this.handler(inbound)
	}

	async stop(): Promise<void> {
		if (!this.running) return
		this.running = false
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
		this.ws?.close()
		this.ws = null
	}

	async sendMessage(msg: OutboundMessage): Promise<void> {
		if (!this.baseUrl) throw new Error('Mattermost client is not running')

		await fetch(`${this.baseUrl}/api/v4/posts`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				channel_id: msg.chatId,
				message: msg.content,
				...(msg.replyToId ? { root_id: msg.replyToId } : {}),
			}),
		})
	}

	async sendTyping(chatId: string): Promise<void> {
		this.ws?.send(
			JSON.stringify({
				action: 'user_typing',
				data: { channel_id: chatId },
			}),
		)
	}

	getMaxMessageLength(): number {
		return 16383
	}
}
