import { getDb, settings } from '@openmotoko/core'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'

const ALLOWED_SETTINGS_KEYS = new Set([
	'defaultModel',
	'onboardingComplete',
	'anthropicApiKey',
	'openaiApiKey',
	'googleAiApiKey',
	'ollamaHost',
	'systemPrompt',
	'budget',
	'theme',
	'llm.defaultProvider',
	'llm.defaultModel',
	'app.port',
	'app.host',
])

const updateSettingsSchema = z.record(z.string(), z.unknown()).refine(
	(data) => Object.keys(data).every((key) => ALLOWED_SETTINGS_KEYS.has(key)),
	{ message: 'Unknown setting key' },
)

export default async function settingsRoutes(fastify: FastifyInstance) {
	fastify.get('/api/settings', async (_request, reply) => {
		const db = getDb()
		const rows = await db.select().from(settings)

		const result: Record<string, unknown> = {}
		for (const row of rows) {
			try {
				result[row.key] = JSON.parse(row.value)
			} catch {
				result[row.key] = row.value
			}
		}

		return reply.send(result)
	})

	fastify.put(
		'/api/settings',
		{ preHandler: validate({ body: updateSettingsSchema }) },
		async (request, reply) => {
			const body = request.body as Record<string, unknown>
			const db = getDb()
			const now = Date.now()

			for (const [key, value] of Object.entries(body)) {
				const serialized = JSON.stringify(value)

				await db
					.insert(settings)
					.values({ key, value: serialized, updatedAt: now })
					.onConflictDoUpdate({
						target: settings.key,
						set: { value: serialized, updatedAt: now },
					})
			}

			return reply.send({ ok: true })
		},
	)
}
