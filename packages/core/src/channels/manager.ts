import { eventBus } from '../events/bus.js'
import { PairingManager } from './pairing.js'
import type { ChannelPlugin } from './plugin.js'
import { ChannelRouter } from './router.js'
import type {
	ChannelAdapter,
	ChannelAdapterConfig,
	ChannelStatus,
	ChannelType,
	DmPolicy,
	GroupConfig,
	InboundMessage,
} from './types.js'

interface ManagedChannel {
	adapter: ChannelAdapter
	config: ChannelAdapterConfig
	groupConfig: GroupConfig
	dmPolicy: DmPolicy
	status: ChannelStatus
}

export class ChannelManager {
	private channels = new Map<string, ManagedChannel>()
	readonly router = new ChannelRouter()
	readonly pairing = new PairingManager()

	async addChannel(
		adapter: ChannelAdapter,
		config: ChannelAdapterConfig,
		options?: { groupConfig?: Partial<GroupConfig>; dmPolicy?: Partial<DmPolicy> },
	): Promise<void> {
		const managed: ManagedChannel = {
			adapter,
			config,
			groupConfig: {
				activationMode: options?.groupConfig?.activationMode ?? 'mention',
				mentionKeywords: options?.groupConfig?.mentionKeywords ?? ['@openmotoko', '@bot'],
			},
			dmPolicy: {
				allowUnknown: options?.dmPolicy?.allowUnknown ?? false,
				requirePairing: options?.dmPolicy?.requirePairing ?? true,
			},
			status: {
				id: adapter.id,
				type: adapter.type,
				connected: false,
			},
		}

		this.channels.set(adapter.id, managed)
		this.router.registerAdapter(adapter)
	}

	async startChannel(channelId: string): Promise<void> {
		const managed = this.channels.get(channelId)
		if (!managed) throw new Error(`Channel ${channelId} not found`)

		try {
			await managed.adapter.start(managed.config)
			managed.status.connected = true
			managed.status.error = undefined

			eventBus.emit('channel:message', {
				type: 'channel:message',
				channelId,
				channelType: managed.adapter.type,
				content: `Channel ${managed.adapter.type} connected`,
			})
		} catch (err) {
			managed.status.connected = false
			managed.status.error = err instanceof Error ? err.message : String(err)
			throw err
		}
	}

	async stopChannel(channelId: string): Promise<void> {
		const managed = this.channels.get(channelId)
		if (!managed) return

		await managed.adapter.stop()
		managed.status.connected = false
		this.router.unregisterAdapter(channelId)

		eventBus.emit('channel:message', {
			type: 'channel:message',
			channelId,
			channelType: managed.adapter.type,
			content: `Channel ${managed.adapter.type} disconnected`,
		})
	}

	async startAll(): Promise<void> {
		for (const [id] of this.channels) {
			try {
				await this.startChannel(id)
			} catch {
				void 0
			}
		}
	}

	async stopAll(): Promise<void> {
		for (const [id] of this.channels) {
			await this.stopChannel(id)
		}
	}

	shouldProcess(msg: InboundMessage): boolean {
		const managed = this.channels.get(msg.channelId)
		if (!managed) return false

		if (!msg.isGroup) {
			if (managed.dmPolicy.requirePairing) {
				return this.pairing.isSenderApproved(msg.channelType, msg.senderId)
			}
			return managed.dmPolicy.allowUnknown
		}

		const { activationMode, mentionKeywords } = managed.groupConfig

		switch (activationMode) {
			case 'always':
				return true
			case 'mention':
				return (
					msg.isMention === true ||
					mentionKeywords.some((kw) => msg.content.toLowerCase().includes(kw.toLowerCase()))
				)
			case 'command-only':
				return msg.content.startsWith('/')
		}
	}

	getChannelStatus(channelId: string): ChannelStatus | null {
		return this.channels.get(channelId)?.status ?? null
	}

	getAllStatuses(): ChannelStatus[] {
		return [...this.channels.values()].map((c) => c.status)
	}

	getChannel(channelId: string): ChannelAdapter | undefined {
		return this.channels.get(channelId)?.adapter
	}

	getChannelsByType(type: ChannelType): ChannelAdapter[] {
		return [...this.channels.values()].filter((c) => c.adapter.type === type).map((c) => c.adapter)
	}

	removeChannel(channelId: string): void {
		this.channels.delete(channelId)
		this.router.unregisterAdapter(channelId)
	}

	async addPlugin(
		plugin: ChannelPlugin,
		config: ChannelAdapterConfig,
		options?: { groupConfig?: Partial<GroupConfig>; dmPolicy?: Partial<DmPolicy> },
	): Promise<void> {
		const adapter = plugin.create(config)
		await this.addChannel(adapter, config, options)
	}
}

let instance: ChannelManager | null = null

export function getChannelManager(): ChannelManager {
	if (!instance) {
		instance = new ChannelManager()
	}
	return instance
}
