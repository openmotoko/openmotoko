import { activity, getDb } from '@openmotoko/core'
import { and, desc, eq, type SQL } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'

const activityQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(20),
	offset: z.coerce.number().int().min(0).default(0),
	channel: z.string().optional(),
	skillId: z.string().optional(),
	type: z.string().optional(),
})

export default async function activityRoutes(fastify: FastifyInstance) {
	fastify.get(
		'/api/activity',
		{ preHandler: validate({ query: activityQuerySchema }) },
		async (request, reply) => {
			const db = getDb()
			const query = request.query as {
				limit: number
				offset: number
				channel?: string
				skillId?: string
				type?: string
			}

			const conditions: SQL[] = []

			if (query.channel) {
				conditions.push(eq(activity.channel, query.channel))
			}
			if (query.skillId) {
				conditions.push(eq(activity.skillId, query.skillId))
			}
			if (query.type) {
				conditions.push(eq(activity.type, query.type))
			}

			const where = conditions.length > 0 ? and(...conditions) : undefined

			const rows = await db
				.select()
				.from(activity)
				.where(where)
				.orderBy(desc(activity.createdAt))
				.limit(query.limit)
				.offset(query.offset)

			return reply.send(rows)
		},
	)
}
