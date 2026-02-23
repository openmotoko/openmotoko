export type ChannelType =
	| 'telegram'
	| 'whatsapp'
	| 'discord'
	| 'slack'
	| 'signal'
	| 'imessage'
	| 'google-chat'
	| 'teams'
	| 'webchat'
	| 'matrix'
	| 'feishu'
	| 'line'
	| 'irc'
	| 'mattermost'

export type ActivationMode = 'mention' | 'always' | 'command-only'

export interface InboundMessage {
	id: string
	channelId: string
	channelType: ChannelType
	chatId: string
	senderId: string
	senderName: string
	content: string
	isGroup: boolean
	groupId?: string
	isMention?: boolean
	replyToId?: string
	attachments?: MediaAttachment[]
	timestamp: number
}

export interface OutboundMessage {
	chatId: string
	content: string
	replyToId?: string
	attachments?: MediaAttachment[]
}

export interface MediaAttachment {
	type: 'image' | 'audio' | 'video' | 'document'
	url?: string
	buffer?: Buffer
	mimeType: string
	filename?: string
	size?: number
}

export interface GroupConfig {
	activationMode: ActivationMode
	mentionKeywords: string[]
}

export interface DmPolicy {
	allowUnknown: boolean
	requirePairing: boolean
}

export interface ChannelAdapterConfig {
	[key: string]: unknown
}

export type MessageHandler = (msg: InboundMessage) => void | Promise<void>

export interface ChannelAdapter {
	readonly id: string
	readonly type: ChannelType
	start(config: ChannelAdapterConfig): Promise<void>
	stop(): Promise<void>
	sendMessage(msg: OutboundMessage): Promise<void>
	sendTyping(chatId: string): Promise<void>
	onMessage(handler: MessageHandler): void
	getMaxMessageLength(): number
}

export interface ChannelStatus {
	id: string
	type: ChannelType
	connected: boolean
	error?: string
}

export interface PairingRequest {
	id: string
	channelId: string
	channelType: ChannelType
	senderId: string
	senderName: string
	code: string
	createdAt: number
	expiresAt: number
	approved: boolean
}

export type ChatCommand =
	| { type: 'status' }
	| { type: 'new' }
	| { type: 'reset' }
	| { type: 'compact' }
	| { type: 'model'; model: string }
	| { type: 'think'; level: string }
	| { type: 'cost' }
	| { type: 'help' }
	| { type: 'unknown'; raw: string }
