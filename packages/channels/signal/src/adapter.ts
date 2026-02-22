import { type ChildProcess, spawn } from 'node:child_process'
import { createInterface, type Interface as ReadlineInterface } from 'node:readline'
import type {
	ChannelAdapter,
	ChannelAdapterConfig,
	InboundMessage,
	MessageHandler,
	OutboundMessage,
} from '@openmotoko/core'
import { nanoid } from '@openmotoko/core'

interface SignalDataMessage {
	timestamp: number
	message?: string
	groupInfo?: {
		groupId: string
		type: string
	} | null
}

interface SignalEnvelope {
	source: string
	sourceName?: string
	sourceDevice?: number
	timestamp: number
	dataMessage?: SignalDataMessage
}

interface SignalNotification {
	jsonrpc: string
	method: string
	params?: {
		envelope?: SignalEnvelope
	}
}

export class SignalChannel implements ChannelAdapter {
	readonly id: string
	readonly type = 'signal' as const

	private process: ChildProcess | null = null
	private readline: ReadlineInterface | null = null
	private handler: MessageHandler | null = null
	private running = false
	private rpcId = 0
	private signalNumber = ''

	constructor(id: string) {
		this.id = id
	}

	onMessage(handler: MessageHandler): void {
		this.handler = handler
	}

	async start(config: ChannelAdapterConfig): Promise<void> {
		if (this.running) return

		this.signalNumber = config.signalNumber as string
		const bin = (config.signalCliBin as string | undefined) ?? 'signal-cli'

		this.process = spawn(bin, ['-a', this.signalNumber, '--output=json', 'daemon'], {
			stdio: ['pipe', 'pipe', 'pipe'],
		})

		this.process.on('error', () => {
			this.running = false
		})

		this.process.on('exit', () => {
			this.running = false
		})

		if (this.process.stdout) {
			this.readline = createInterface({ input: this.process.stdout })
			this.readline.on('line', (line) => this.handleLine(line))
		}

		this.running = true
	}

	private handleLine(line: string): void {
		if (!this.handler) return

		let parsed: SignalNotification
		try {
			parsed = JSON.parse(line) as SignalNotification
		} catch {
			return
		}

		if (parsed.method !== 'receive') return

		const envelope = parsed.params?.envelope
		const content = envelope?.dataMessage?.message
		if (!envelope || !content) return

		const data = envelope.dataMessage as {
			message: string
			groupInfo?: { groupId: string }
			timestamp: number
		}
		const isGroup = data.groupInfo != null
		const chatId = isGroup ? (data.groupInfo?.groupId ?? envelope.source) : envelope.source

		const msg: InboundMessage = {
			id: nanoid(),
			channelId: this.id,
			channelType: 'signal',
			chatId,
			senderId: envelope.source,
			senderName: envelope.sourceName ?? envelope.source,
			content,
			isGroup,
			groupId: isGroup ? data.groupInfo?.groupId : undefined,
			timestamp: envelope.timestamp,
		}

		this.handler(msg)
	}

	async stop(): Promise<void> {
		if (!this.running) return
		this.running = false

		this.readline?.close()
		this.readline = null

		if (this.process) {
			this.process.kill('SIGTERM')
			this.process = null
		}
	}

	async sendMessage(msg: OutboundMessage): Promise<void> {
		const isGroup = !msg.chatId.startsWith('+')
		const params: Record<string, unknown> = {
			message: msg.content,
		}

		if (isGroup) {
			params.groupId = msg.chatId
		} else {
			params.recipient = [msg.chatId]
		}

		if (msg.replyToId) {
			params.quoteTimestamp = Number(msg.replyToId)
		}

		this.sendRpc('send', params)
	}

	async sendTyping(chatId: string): Promise<void> {
		const isGroup = !chatId.startsWith('+')

		const params: Record<string, unknown> = isGroup ? { groupId: chatId } : { recipient: [chatId] }

		this.sendRpc('sendTyping', params)
	}

	getMaxMessageLength(): number {
		return 10000
	}

	private sendRpc(method: string, params: Record<string, unknown>): void {
		if (!this.process?.stdin?.writable) return

		this.rpcId++
		const request = JSON.stringify({
			jsonrpc: '2.0',
			method,
			id: this.rpcId,
			params,
		})

		this.process.stdin.write(`${request}\n`)
	}
}
