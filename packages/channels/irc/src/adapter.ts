import type { Socket } from 'node:net'
import { createConnection } from 'node:net'
import type {
	ChannelAdapter,
	ChannelAdapterConfig,
	InboundMessage,
	MessageHandler,
	OutboundMessage,
} from '@openmotoko/core'
import { nanoid } from '@openmotoko/core'

export class IrcChannel implements ChannelAdapter {
	readonly id: string
	readonly type = 'irc' as const

	private socket: Socket | null = null
	private handler: MessageHandler | null = null
	private running = false
	private nick = ''
	private buffer = ''

	constructor(id: string) {
		this.id = id
	}

	onMessage(handler: MessageHandler): void {
		this.handler = handler
	}

	async start(config: ChannelAdapterConfig): Promise<void> {
		if (this.running) return

		const host = config.host as string
		const port = (config.port as number) ?? 6667
		this.nick = config.nick as string
		const channels = (config.channels as string[]) ?? []
		const password = config.password as string | undefined

		return new Promise((resolve, reject) => {
			this.socket = createConnection({ host, port }, () => {
				if (!this.socket) return
				if (password) this.send(`PASS ${password}`)
				this.send(`NICK ${this.nick}`)
				this.send(`USER ${this.nick} 0 * :OpenMotoko Bot`)
				this.running = true
				resolve()
			})

			this.socket.setEncoding('utf-8')
			this.socket.on('data', (data: string) => this.onData(data, channels))
			this.socket.on('error', (err: Error) => {
				if (!this.running) reject(err)
			})
			this.socket.on('close', () => {
				this.running = false
				this.socket = null
			})
		})
	}

	private onData(data: string, autoJoinChannels: string[]): void {
		this.buffer += data
		const lines = this.buffer.split('\r\n')
		this.buffer = lines.pop() ?? ''

		for (const line of lines) {
			if (line.startsWith('PING')) {
				this.send(`PONG${line.slice(4)}`)
				continue
			}

			if (line.includes(' 001 ')) {
				for (const ch of autoJoinChannels) {
					this.send(`JOIN ${ch}`)
				}
				continue
			}

			const privmsgMatch = line.match(/^:([^!]+)!\S+\s+PRIVMSG\s+(\S+)\s+:(.+)$/)
			if (privmsgMatch && this.handler) {
				const [, sender, target, content] = privmsgMatch
				const isGroup = target.startsWith('#') || target.startsWith('&')

				const inbound: InboundMessage = {
					id: nanoid(),
					channelId: this.id,
					channelType: 'irc',
					chatId: isGroup ? target : sender,
					senderId: sender,
					senderName: sender,
					content,
					isGroup,
					groupId: isGroup ? target : undefined,
					isMention: content.toLowerCase().includes(this.nick.toLowerCase()),
					timestamp: Date.now(),
				}

				this.handler(inbound)
			}
		}
	}

	private send(raw: string): void {
		this.socket?.write(`${raw}\r\n`)
	}

	async stop(): Promise<void> {
		if (!this.running || !this.socket) return
		this.running = false
		this.send('QUIT :Goodbye')
		this.socket.destroy()
		this.socket = null
	}

	async sendMessage(msg: OutboundMessage): Promise<void> {
		if (!this.socket) throw new Error('IRC connection is not running')
		this.send(`PRIVMSG ${msg.chatId} :${msg.content}`)
	}

	async sendTyping(_chatId: string): Promise<void> {}

	getMaxMessageLength(): number {
		return 512
	}
}
