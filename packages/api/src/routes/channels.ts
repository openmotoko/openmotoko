import { channels, getDb } from '@openmotoko/core'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'

const idParamsSchema = z.object({
	id: z.string().min(1),
})

const updateChannelSchema = z.object({
	config: z.record(z.string(), z.unknown()).optional(),
	enabled: z.boolean().optional(),
})

export default async function channelRoutes(fastify: FastifyInstance) {
	fastify.get('/api/channels', async (_request, reply) => {
		const db = getDb()
		const rows = await db.select().from(channels)

		return reply.send(
			rows.map((row) => {
				let config = null
				try {
					config = row.config ? JSON.parse(row.config) : null
				} catch {}
				return { ...row, config, enabled: Boolean(row.enabled) }
			}),
		)
	})

	fastify.put(
		'/api/channels/:id',
		{ preHandler: validate({ params: idParamsSchema, body: updateChannelSchema }) },
		async (request, reply) => {
			const params = request.params as { id: string }
			const body = request.body as { config?: Record<string, unknown>; enabled?: boolean }
			const db = getDb()

			const [channel] = await db.select().from(channels).where(eq(channels.id, params.id)).limit(1)

			if (!channel) {
				return reply.status(404).send({
					error: 'Channel not found',
					code: 'NOT_FOUND',
				})
			}

			const updates: Record<string, unknown> = {}

			if (body.config !== undefined) {
				updates.config = JSON.stringify(body.config)
			}
			if (body.enabled !== undefined) {
				updates.enabled = body.enabled ? 1 : 0
			}

			if (Object.keys(updates).length > 0) {
				await db.update(channels).set(updates).where(eq(channels.id, params.id))
			}

			const [updated] = await db.select().from(channels).where(eq(channels.id, params.id)).limit(1)

			let config = null
			try {
				config = updated.config ? JSON.parse(updated.config) : null
			} catch {}
			return reply.send({
				...updated,
				config,
				enabled: Boolean(updated.enabled),
			})
		},
	)
}
