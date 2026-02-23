export { getHelpText, isCommand, parseCommand } from './commands.js'
export { ChannelManager, getChannelManager } from './manager.js'
export { CHANNEL_MAX_LENGTH, classifyMimeType, normalizeAttachment, splitMessage } from './media.js'
export { PairingManager } from './pairing.js'
export type { ChannelPlugin, ChannelPluginMeta } from './plugin.js'
export { ChannelPluginRegistry, getChannelPluginRegistry } from './plugin.js'
export { loadChannelPlugin, loadChannelPlugins } from './plugin-loader.js'
export type { PolicyResult } from './policy.js'
export {
	approveSender,
	enforcePolicy,
	getPairingManager,
	listAllowed,
	revokeSender,
} from './policy.js'
export type { CommandHandler, InboundHandler } from './router.js'
export { ChannelRouter } from './router.js'
export type {
	ActivationMode,
	ChannelAdapter,
	ChannelAdapterConfig,
	ChannelStatus,
	ChannelType,
	ChatCommand,
	DmPolicy,
	GroupConfig,
	InboundMessage,
	MediaAttachment,
	MessageHandler,
	OutboundMessage,
	PairingRequest,
} from './types.js'
