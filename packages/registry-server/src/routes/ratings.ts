import { desc, eq, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { getRegistryDb } from '../db/client.js'
import { registrySkills, skillRatings } from '../db/schema.js'

const rateBody = z.object({
	userId: z.string().min(1),
	stars: z.number().int().min(1).max(5),
	comment: z.string().optional(),
})

export default async function ratingsRoutes(fastify: FastifyInstance) {
	fastify.post('/api/skills/:id/rate', async (request, reply) => {
		const { id } = request.params as { id: string }
		const raw = rateBody.safeParse(request.body)
		if (!raw.success) return reply.status(400).send({ error: raw.error.message })

		const db = getRegistryDb()
		const [skill] = db.select().from(registrySkills).where(eq(registrySkills.id, id)).all()
		if (!skill) return reply.status(404).send({ error: 'Skill not found' })

		db.insert(skillRatings)
			.values({
				id: nanoid(),
				skillId: id,
				userId: raw.data.userId,
				stars: raw.data.stars,
				comment: raw.data.comment ?? '',
				createdAt: Date.now(),
			})
			.run()

		const [stats] = db
			.select({
				avg: sql<number>`avg(stars)`,
				count: sql<number>`count(*)`,
			})
			.from(skillRatings)
			.where(eq(skillRatings.skillId, id))
			.all()

		db.update(registrySkills)
			.set({
				rating: Math.round((stats?.avg ?? 0) * 10) / 10,
				ratingCount: stats?.count ?? 0,
			})
			.where(eq(registrySkills.id, id))
			.run()

		return reply.send({ success: true, rating: stats?.avg ?? 0, ratingCount: stats?.count ?? 0 })
	})

	fastify.get('/api/skills/:id/ratings', async (request, reply) => {
		const { id } = request.params as { id: string }
		const db = getRegistryDb()

		const ratings = db
			.select()
			.from(skillRatings)
			.where(eq(skillRatings.skillId, id))
			.orderBy(desc(skillRatings.createdAt))
			.limit(50)
			.all()

		return reply.send({ ratings })
	})
}
