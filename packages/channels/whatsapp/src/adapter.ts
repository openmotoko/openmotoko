import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type {
	ChannelAdapter,
	ChannelAdapterConfig,
	InboundMessage,
	MediaAttachment,
	MessageHandler,
	OutboundMessage,
} from '@openmotoko/core'
import { classifyMimeType, eventBus, nanoid, splitMessage } from '@openmotoko/core'
import type { WAMessage, WASocket } from '@whiskeysockets/baileys'
import {
	DisconnectReason,
	downloadMediaMessage,
	makeWASocket,
	useMultiFileAuthState,
} from '@whiskeysockets/baileys'
import { generate as printQR } from 'qrcode-terminal'

interface BoomLikeError {
	output?: { statusCode?: number }
}

export class WhatsAppChannel implements ChannelAdapter {
	readonly id: string
	readonly type = 'whatsapp' as const

	private socket: WASocket | null = null
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

		const authDir =
			(config.authDir as string | undefined) ?? join(homedir(), '.openmotoko', 'whatsapp-auth')
		await mkdir(authDir, { recursive: true })

		const { state, saveCreds } = await useMultiFileAuthState(authDir)

		const socket = makeWASocket({
			auth: state,
			printQRInTerminal: false,
		})
		this.socket = socket
		this.running = true

		socket.ev.on('creds.update', saveCreds)

		socket.ev.on('connection.update', (update) => {
			const { connection, lastDisconnect, qr } = update

			if (qr) {
				printQR(qr, { small: true })
				eventBus.emit('channel:message', {
					type: 'channel:message',
					channelId: this.id,
					channelType: this.type,
					content: 'QR code displayed in terminal',
				})
			}

			if (connection === 'close') {
				const code = (lastDisconnect?.error as BoomLikeError)?.output?.statusCode
				this.socket = null
				this.running = false
				if (code !== DisconnectReason.loggedOut) {
					void this.start(config)
				}
			}

			if (connection === 'open') {
				eventBus.emit('channel:message', {
					type: 'channel:message',
					channelId: this.id,
					channelType: this.type,
					content: 'WhatsApp connected',
				})
			}
		})

		socket.ev.on('messages.upsert', async ({ messages, type }) => {
			if (type !== 'notify') return
			for (const msg of messages) {
				if (msg.key.fromMe) continue
				if (!msg.message) continue
				await this.handleIncoming(msg)
			}
		})
	}

	async stop(): Promise<void> {
		if (!this.running || !this.socket) return
		this.running = false
		this.socket.end(undefined)
		this.socket = null
	}

	async sendMessage(msg: OutboundMessage): Promise<void> {
		if (!this.socket) throw new Error('WhatsApp is not connected')

		if (msg.content) {
			const chunks = splitMessage(msg.content, this.getMaxMessageLength())
			for (const chunk of chunks) {
				await this.socket.sendMessage(msg.chatId, { text: chunk })
			}
		}

		if (msg.attachments) {
			for (const att of msg.attachments) {
				await this.sendAttachment(msg.chatId, att)
			}
		}
	}

	async sendTyping(chatId: string): Promise<void> {
		if (!this.socket) return
		await this.socket.presenceSubscribe(chatId)
		await this.socket.sendPresenceUpdate('composing', chatId)
	}

	getMaxMessageLength(): number {
		return 65536
	}

	private async handleIncoming(msg: WAMessage): Promise<void> {
		const jid = msg.key.remoteJid
		if (!jid) return

		const isGroup = jid.endsWith('@g.us')
		const senderId = isGroup ? (msg.key.participant ?? jid) : jid
		const text = this.extractText(msg)
		const attachments = await this.extractAttachments(msg)

		if (!text && attachments.length === 0) return

		const inbound: InboundMessage = {
			id: msg.key.id ?? nanoid(),
			channelId: this.id,
			channelType: 'whatsapp',
			chatId: jid,
			senderId,
			senderName: msg.pushName ?? senderId,
			content: text ?? '',
			isGroup,
			groupId: isGroup ? jid : undefined,
			isMention: this.checkMention(msg),
			replyToId: msg.message?.extendedTextMessage?.contextInfo?.stanzaId ?? undefined,
			attachments: attachments.length > 0 ? attachments : undefined,
			timestamp: (Number(msg.messageTimestamp) || 0) * 1000,
		}

		this.handler?.(inbound)

		eventBus.emit('channel:message', {
			type: 'channel:message',
			channelId: this.id,
			channelType: this.type,
			content: inbound.content,
		})
	}

	private extractText(msg: WAMessage): string | undefined {
		const m = msg.message
		if (!m) return undefined
		return (
			m.conversation ??
			m.extendedTextMessage?.text ??
			m.imageMessage?.caption ??
			m.videoMessage?.caption ??
			m.documentMessage?.caption ??
			undefined
		)
	}

	private async extractAttachments(msg: WAMessage): Promise<MediaAttachment[]> {
		const m = msg.message
		if (!m) return []

		let mimeType: string | null | undefined
		let filename: string | null | undefined

		if (m.imageMessage) {
			mimeType = m.imageMessage.mimetype
		} else if (m.videoMessage) {
			mimeType = m.videoMessage.mimetype
		} else if (m.audioMessage) {
			mimeType = m.audioMessage.mimetype
		} else if (m.documentMessage) {
			mimeType = m.documentMessage.mimetype
			filename = m.documentMessage.fileName
		} else {
			return []
		}

		try {
			const buffer = await downloadMediaMessage(msg, 'buffer', {})
			const mime = mimeType ?? 'application/octet-stream'
			return [
				{
					type: classifyMimeType(mime),
					buffer: buffer as Buffer,
					mimeType: mime,
					filename: filename ?? undefined,
				},
			]
		} catch {
			return []
		}
	}

	private checkMention(msg: WAMessage): boolean {
		const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
		if (!mentioned || !this.socket?.user?.id) return false
		const selfJid = this.socket.user.id.replace(/:.*@/, '@')
		return mentioned.some((jid) => jid?.replace(/:.*@/, '@') === selfJid)
	}

	private async sendAttachment(chatId: string, att: MediaAttachment): Promise<void> {
		if (!this.socket) return
		if (!att.buffer && !att.url) return

		const media = att.buffer ?? { url: att.url as string }

		switch (att.type) {
			case 'image':
				await this.socket.sendMessage(chatId, {
					image: media,
					mimetype: att.mimeType,
				})
				break
			case 'video':
				await this.socket.sendMessage(chatId, {
					video: media,
					mimetype: att.mimeType,
				})
				break
			case 'audio':
				await this.socket.sendMessage(chatId, {
					audio: media,
					mimetype: att.mimeType,
				})
				break
			case 'document':
				await this.socket.sendMessage(chatId, {
					document: media,
					mimetype: att.mimeType,
					fileName: att.filename ?? 'file',
				})
				break
		}
	}
}
