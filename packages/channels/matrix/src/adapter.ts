import type {
	ChannelAdapter,
	ChannelAdapterConfig,
	InboundMessage,
	MessageHandler,
	OutboundMessage,
} from '@openmotoko/core'
import { nanoid } from '@openmotoko/core'
import sdk from 'matrix-js-sdk'

export class MatrixChannel implements ChannelAdapter {
	readonly id: string
	readonly type = 'matrix' as const

	private client: sdk.MatrixClient | null = null
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

		const homeserverUrl = config.homeserverUrl as string
		const accessToken = config.accessToken as string
		const userId = config.userId as string

		this.client = sdk.createClient({
			baseUrl: homeserverUrl,
			accessToken,
			userId,
		})

		this.client.on(sdk.RoomEvent.Timeline, (event: sdk.MatrixEvent, room: sdk.Room | undefined) => {
			if (!this.handler) return
			if (event.getType() !== 'm.room.text') return
			if (event.getSender() === userId) return

			const body = event.getContent().body
			if (typeof body !== 'string') return

			const roomId = room?.roomId ?? ''
			const members = room?.getJoinedMemberCount() ?? 1
			const isGroup = members > 2

			const inbound: InboundMessage = {
				id: nanoid(),
				channelId: this.id,
				channelType: 'matrix',
				chatId: roomId,
				senderId: event.getSender() ?? '',
				senderName: event.sender?.name ?? event.getSender() ?? '',
				content: body,
				isGroup,
				groupId: isGroup ? roomId : undefined,
				isMention: body.includes(userId),
				timestamp: event.getTs(),
			}

			this.handler(inbound)
		})

		await this.client.startClient({ initialSyncLimit: 0 })
		this.running = true
	}

	async stop(): Promise<void> {
		if (!this.running || !this.client) return
		this.running = false
		this.client.stopClient()
		this.client = null
	}

	async sendMessage(msg: OutboundMessage): Promise<void> {
		if (!this.client) throw new Error('Matrix client is not running')

		await this.client.sendTextMessage(msg.chatId, msg.content)
	}

	async sendTyping(chatId: string): Promise<void> {
		if (!this.client) return
		await this.client.sendTyping(chatId, true, 5000)
	}

	getMaxMessageLength(): number {
		return 65536
	}
}
