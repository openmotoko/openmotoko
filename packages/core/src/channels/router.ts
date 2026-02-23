import { getHelpText, isCommand, parseCommand } from './commands.js'
import { CHANNEL_MAX_LENGTH, splitMessage } from './media.js'
import { enforcePolicy } from './policy.js'
import type { ChannelAdapter, ChannelType, InboundMessage } from './types.js'

export type InboundHandler = (msg: InboundMessage) => Promise<string | null>
export type CommandHandler = (
	msg: InboundMessage,
	command: ReturnType<typeof parseCommand>,
) => Promise<string | null>

export class ChannelRouter {
	private messageHandler: InboundHandler | null = null
	private commandHandler: CommandHandler | null = null
	private adapters = new Map<string, ChannelAdapter>()

	registerAdapter(adapter: ChannelAdapter): void {
		this.adapters.set(adapter.id, adapter)
		adapter.onMessage(async (msg) => {
			await this.routeMessage(adapter, msg)
		})
	}

	unregisterAdapter(adapterId: string): void {
		this.adapters.delete(adapterId)
	}

	onMessage(handler: InboundHandler): void {
		this.messageHandler = handler
	}

	onCommand(handler: CommandHandler): void {
		this.commandHandler = handler
	}

	getAdapter(adapterId: string): ChannelAdapter | undefined {
		return this.adapters.get(adapterId)
	}

	getAdaptersByType(type: ChannelType): ChannelAdapter[] {
		return [...this.adapters.values()].filter((a) => a.type === type)
	}

	getAllAdapters(): ChannelAdapter[] {
		return [...this.adapters.values()]
	}

	private async routeMessage(adapter: ChannelAdapter, msg: InboundMessage): Promise<void> {
		const policyResult = await enforcePolicy(adapter.type, msg)
		if (!policyResult.allowed) {
			if (policyResult.pairingChallenge) {
				await this.sendResponse(
					adapter,
					msg.chatId,
					`Pairing required. Send this code to connect: ${policyResult.pairingChallenge}`,
				)
			}
			return
		}

		if (isCommand(msg.content)) {
			const cmd = parseCommand(msg.content)
			if (cmd?.type === 'help') {
				await this.sendResponse(adapter, msg.chatId, getHelpText())
				return
			}
			if (this.commandHandler && cmd) {
				const response = await this.commandHandler(msg, cmd)
				if (response) {
					await this.sendResponse(adapter, msg.chatId, response)
				}
				return
			}
		}

		if (!this.messageHandler) return

		try {
			await adapter.sendTyping(msg.chatId)
		} catch {
			void 0
		}

		const response = await this.messageHandler(msg)
		if (response) {
			await this.sendResponse(adapter, msg.chatId, response)
		}
	}

	private async sendResponse(
		adapter: ChannelAdapter,
		chatId: string,
		content: string,
	): Promise<void> {
		const maxLen = CHANNEL_MAX_LENGTH[adapter.type] ?? adapter.getMaxMessageLength()
		const chunks = splitMessage(content, maxLen)

		for (const chunk of chunks) {
			await adapter.sendMessage({ chatId, content: chunk })
		}
	}
}
