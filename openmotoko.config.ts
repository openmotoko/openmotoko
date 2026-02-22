interface ChannelPluginConfig {
	packageName: string
	config: Record<string, unknown>
}

interface OpenMotokoConfig {
	channelPlugins?: ChannelPluginConfig[]
}

const config: OpenMotokoConfig = {
	channelPlugins: [],
}

export default config
