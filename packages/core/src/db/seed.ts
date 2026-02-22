import { getDb } from './client.js'
import { settings, skills } from './schema.js'

const defaultSettings = [
	{ key: 'llm.defaultProvider', value: JSON.stringify('anthropic') },
	{ key: 'llm.defaultModel', value: JSON.stringify('claude-sonnet-4-20250514') },
	{ key: 'app.port', value: JSON.stringify(3457) },
	{ key: 'app.host', value: JSON.stringify('0.0.0.0') },
]

const coreSkills = [
	{
		name: 'shell-executor',
		version: '0.1.0',
		description: 'Execute shell commands and scripts',
		manifest: JSON.stringify({ tools: ['execute', 'spawn'] }),
	},
	{
		name: 'filesystem',
		version: '0.1.0',
		description: 'Read, write, and manage files and directories',
		manifest: JSON.stringify({ tools: ['read', 'write', 'list', 'delete', 'move'] }),
	},
	{
		name: 'web-fetch',
		version: '0.1.0',
		description: 'Fetch content from URLs',
		manifest: JSON.stringify({ tools: ['fetch', 'download'] }),
	},
	{
		name: 'web-search',
		version: '0.1.0',
		description: 'Search the web for information',
		manifest: JSON.stringify({ tools: ['search'] }),
	},
	{
		name: 'browser-control',
		version: '0.1.0',
		description: 'Control a headless browser for automation',
		manifest: JSON.stringify({
			tools: ['navigate', 'click', 'type', 'screenshot', 'evaluate'],
		}),
	},
	{
		name: 'calendar',
		version: '0.1.0',
		description: 'Manage calendar events and reminders',
		manifest: JSON.stringify({ tools: ['list', 'create', 'update', 'delete'] }),
	},
	{
		name: 'email',
		version: '0.1.0',
		description: 'Send and read emails',
		manifest: JSON.stringify({ tools: ['send', 'read', 'list', 'search'] }),
	},
	{
		name: 'github',
		version: '0.1.0',
		description: 'Interact with GitHub repositories and issues',
		manifest: JSON.stringify({
			tools: ['repos', 'issues', 'pulls', 'commits', 'search'],
		}),
	},
	{
		name: 'timer-cron',
		version: '0.1.0',
		description: 'Schedule tasks with timers and cron expressions',
		manifest: JSON.stringify({ tools: ['setTimeout', 'setCron', 'list', 'cancel'] }),
	},
]

export async function seed() {
	const db = getDb()

	await db.insert(settings).values(defaultSettings).onConflictDoNothing()

	await db
		.insert(skills)
		.values(coreSkills.map((s) => ({ ...s, enabled: 1 })))
		.onConflictDoNothing()
}
