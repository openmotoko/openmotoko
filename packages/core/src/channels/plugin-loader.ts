import type { ChannelPlugin } from './plugin.js'
import { getChannelPluginRegistry } from './plugin.js'

export async function loadChannelPlugin(packageName: string): Promise<ChannelPlugin> {
	let mod: Record<string, unknown>
	try {
		mod = (await import(packageName)) as Record<string, unknown>
	} catch (err) {
		throw new Error(
			`Failed to load channel plugin "${packageName}": ${err instanceof Error ? err.message : String(err)}`,
		)
	}

	const plugin = (mod.default ?? mod.plugin ?? mod) as ChannelPlugin

	if (!plugin.id || typeof plugin.id !== 'string') {
		throw new Error(`Channel plugin "${packageName}" missing required "id" property`)
	}
	if (!plugin.name || typeof plugin.name !== 'string') {
		throw new Error(`Channel plugin "${packageName}" missing required "name" property`)
	}
	if (!plugin.version || typeof plugin.version !== 'string') {
		throw new Error(`Channel plugin "${packageName}" missing required "version" property`)
	}
	if (typeof plugin.create !== 'function') {
		throw new Error(`Channel plugin "${packageName}" missing required "create" method`)
	}

	const registry = getChannelPluginRegistry()
	registry.register(plugin, packageName)

	return plugin
}

export async function loadChannelPlugins(packageNames: string[]): Promise<ChannelPlugin[]> {
	const results: ChannelPlugin[] = []
	for (const name of packageNames) {
		try {
			const plugin = await loadChannelPlugin(name)
			results.push(plugin)
		} catch (err) {
			console.error(`Failed to load channel plugin "${name}":`, err)
		}
	}
	return results
}
