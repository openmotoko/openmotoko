import { getDb } from './client.js'
import { settings, skills } from './schema.js'

const defaultSettings = [
	{ key: 'llm.defaultProvider', value: JSON.stringify('anthropic') },
	{ key: 'llm.defaultModel', value: JSON.stringify('claude-sonnet-4-20250514') },
	{ key: 'app.port', value: JSON.stringify(3457) },
	{ key: 'app.host', value: JSON.stringify('0.0.0.0') },
]

const coreSkillIds = [
	'shell-executor',
	'filesystem',
	'web-fetch',
	'web-search',
	'browser-control',
	'calendar',
	'email',
	'github',
	'timer-cron',
]

export async function seed() {
	const db = getDb()

	await db.insert(settings).values(defaultSettings).onConflictDoNothing()

	for (const id of coreSkillIds) {
		await db
			.insert(skills)
			.values({
				name: id,
				version: '0.1.0',
				description: '',
				manifest: '{}',
				enabled: 1,
			})
			.onConflictDoNothing()
	}
}
