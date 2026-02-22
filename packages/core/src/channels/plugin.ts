import type { z } from 'zod'
import type { ChannelAdapter, ChannelAdapterConfig } from './types.js'

export interface ChannelPlugin {
	readonly id: string
	readonly name: string
	readonly version: string
	readonly configSchema: z.ZodType<unknown>
	create(config: ChannelAdapterConfig): ChannelAdapter
}

export interface ChannelPluginMeta {
	id: string
	name: string
	version: string
	packageName: string
	installed: boolean
}

export class ChannelPluginRegistry {
	private plugins = new Map<string, ChannelPlugin>()
	private metadata = new Map<string, ChannelPluginMeta>()

	register(plugin: ChannelPlugin, packageName: string): void {
		this.plugins.set(plugin.id, plugin)
		this.metadata.set(plugin.id, {
			id: plugin.id,
			name: plugin.name,
			version: plugin.version,
			packageName,
			installed: true,
		})
	}

	unregister(pluginId: string): void {
		this.plugins.delete(pluginId)
		this.metadata.delete(pluginId)
	}

	get(pluginId: string): ChannelPlugin | undefined {
		return this.plugins.get(pluginId)
	}

	getAll(): ChannelPlugin[] {
		return [...this.plugins.values()]
	}

	getAllMeta(): ChannelPluginMeta[] {
		return [...this.metadata.values()]
	}

	has(pluginId: string): boolean {
		return this.plugins.has(pluginId)
	}

	createAdapter(pluginId: string, config: ChannelAdapterConfig): ChannelAdapter {
		const plugin = this.plugins.get(pluginId)
		if (!plugin) throw new Error(`Channel plugin "${pluginId}" not found`)

		const parsed = plugin.configSchema.safeParse(config)
		if (!parsed.success) {
			throw new Error(`Invalid config for plugin "${pluginId}": ${parsed.error.message}`)
		}

		return plugin.create(config)
	}
}

let registry: ChannelPluginRegistry | null = null

export function getChannelPluginRegistry(): ChannelPluginRegistry {
	if (!registry) {
		registry = new ChannelPluginRegistry()
	}
	return registry
}
