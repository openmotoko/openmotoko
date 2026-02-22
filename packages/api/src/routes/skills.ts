import { eventBus, getDb, skills } from '@openmotoko/core'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'

const idParamsSchema = z.object({
	id: z.string().min(1),
})

export default async function skillRoutes(fastify: FastifyInstance) {
	fastify.get('/api/skills', async (_request, reply) => {
		const db = getDb()
		const rows = await db.select().from(skills)

		return reply.send(
			rows.map((row) => ({
				...row,
				manifest: row.manifest ? JSON.parse(row.manifest) : null,
				enabled: Boolean(row.enabled),
			})),
		)
	})

	fastify.post(
		'/api/skills/:id/toggle',
		{ preHandler: validate({ params: idParamsSchema }) },
		async (request, reply) => {
			const params = request.params as { id: string }
			const db = getDb()

			const [skill] = await db.select().from(skills).where(eq(skills.id, params.id)).limit(1)

			if (!skill) {
				return reply.status(404).send({
					error: 'Skill not found',
					code: 'NOT_FOUND',
				})
			}

			const newEnabled = skill.enabled ? 0 : 1

			await db.update(skills).set({ enabled: newEnabled }).where(eq(skills.id, params.id))

			if (newEnabled) {
				eventBus.emit('skill:activated', {
					type: 'skill:activated',
					skillId: params.id,
					conversationId: '',
				})
			}

			return reply.send({
				id: skill.id,
				enabled: Boolean(newEnabled),
			})
		},
	)
}
