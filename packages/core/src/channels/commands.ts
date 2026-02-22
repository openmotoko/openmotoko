import type { ChatCommand } from './types.js'

const COMMAND_PREFIX = '/'

export function isCommand(text: string): boolean {
	return text.startsWith(COMMAND_PREFIX)
}

export function parseCommand(text: string): ChatCommand | null {
	if (!isCommand(text)) return null

	const trimmed = text.slice(COMMAND_PREFIX.length).trim()
	const [cmd, ...args] = trimmed.split(/\s+/)
	const lower = cmd?.toLowerCase()

	switch (lower) {
		case 'status':
			return { type: 'status' }
		case 'new':
			return { type: 'new' }
		case 'reset':
			return { type: 'reset' }
		case 'compact':
			return { type: 'compact' }
		case 'model':
			return { type: 'model', model: args.join(' ') || 'smart' }
		case 'think':
			return { type: 'think', level: args[0] || 'normal' }
		case 'cost':
			return { type: 'cost' }
		case 'help':
			return { type: 'help' }
		default:
			return { type: 'unknown', raw: text }
	}
}

export function getHelpText(): string {
	return [
		'/status - Show agent status',
		'/new - Start a new conversation',
		'/reset - Clear conversation history',
		'/compact - Compress conversation context',
		'/model <name> - Switch LLM model',
		'/think <level> - Set thinking depth',
		'/cost - Show session cost',
		'/help - Show this help',
	].join('\n')
}
