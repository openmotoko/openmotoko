import { budgetEnforcer, costLog, getDb, settings } from '@openmotoko/core'
import { desc, gte, sql, sum } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'

const historyQuerySchema = z.object({
	days: z.coerce.number().int().min(1).max(365).default(30),
})

const breakdownQuerySchema = z.object({
	period: z
		.string()
		.regex(/^\d+d$/)
		.default('7d'),
})

const budgetBodySchema = z.object({
	daily: z.number().min(0),
	monthly: z.number().min(0),
	alertThresholds: z.array(z.number().min(0).max(100)),
})

export default async function costRoutes(fastify: FastifyInstance) {
	fastify.get('/api/costs/today', async (_request, reply) => {
		const db = getDb()
		const startOfDay = new Date()
		startOfDay.setHours(0, 0, 0, 0)

		const rows = await db
			.select({
				provider: costLog.provider,
				model: costLog.model,
				cost: sum(costLog.cost),
			})
			.from(costLog)
			.where(gte(costLog.createdAt, startOfDay.getTime()))
			.groupBy(costLog.provider, costLog.model)

		let total = 0
		const byProvider: Record<string, number> = {}
		const byModel: Record<string, number> = {}

		for (const row of rows) {
			const c = Number(row.cost ?? 0)
			total += c
			byProvider[row.provider] = (byProvider[row.provider] ?? 0) + c
			byModel[row.model] = (byModel[row.model] ?? 0) + c
		}

		return reply.send({ total, byProvider, byModel })
	})

	fastify.get(
		'/api/costs/history',
		{ preHandler: validate({ query: historyQuerySchema }) },
		async (request, reply) => {
			const { days } = request.query as { days: number }
			const db = getDb()
			const since = Date.now() - days * 86400000

			const rows = await db
				.select({
					day: sql<string>`date(${costLog.createdAt} / 1000, 'unixepoch')`.as('day'),
					cost: sum(costLog.cost),
					tokens: sum(sql`${costLog.inputTokens} + ${costLog.outputTokens}`),
				})
				.from(costLog)
				.where(gte(costLog.createdAt, since))
				.groupBy(sql`day`)
				.orderBy(sql`day`)

			const result = rows.map((r) => ({
				date: r.day,
				cost: Number(r.cost ?? 0),
				tokens: Number(r.tokens ?? 0),
			}))

			return reply.send(result)
		},
	)

	fastify.get(
		'/api/costs/breakdown',
		{ preHandler: validate({ query: breakdownQuerySchema }) },
		async (request, reply) => {
			const { period } = request.query as { period: string }
			const days = parseInt(period.replace('d', ''), 10)
			const db = getDb()
			const since = Date.now() - days * 86400000

			const providerRows = await db
				.select({
					name: costLog.provider,
					cost: sum(costLog.cost),
					tokens: sum(sql`${costLog.inputTokens} + ${costLog.outputTokens}`),
				})
				.from(costLog)
				.where(gte(costLog.createdAt, since))
				.groupBy(costLog.provider)
				.orderBy(desc(sum(costLog.cost)))

			const modelRows = await db
				.select({
					name: costLog.model,
					cost: sum(costLog.cost),
					tokens: sum(sql`${costLog.inputTokens} + ${costLog.outputTokens}`),
				})
				.from(costLog)
				.where(gte(costLog.createdAt, since))
				.groupBy(costLog.model)
				.orderBy(desc(sum(costLog.cost)))

			return reply.send({
				providers: providerRows.map((r) => ({
					name: r.name,
					cost: Number(r.cost ?? 0),
					tokens: Number(r.tokens ?? 0),
				})),
				models: modelRows.map((r) => ({
					name: r.name,
					cost: Number(r.cost ?? 0),
					tokens: Number(r.tokens ?? 0),
				})),
			})
		},
	)

	fastify.get('/api/settings/budget', async (_request, reply) => {
		const limits = await budgetEnforcer.getLimits()
		return reply.send(limits)
	})

	fastify.put(
		'/api/settings/budget',
		{ preHandler: validate({ body: budgetBodySchema }) },
		async (request, reply) => {
			const body = request.body as { daily: number; monthly: number; alertThresholds: number[] }
			const db = getDb()
			const now = Date.now()

			await db
				.insert(settings)
				.values({ key: 'budget', value: JSON.stringify(body), updatedAt: now })
				.onConflictDoUpdate({
					target: settings.key,
					set: { value: JSON.stringify(body), updatedAt: now },
				})

			budgetEnforcer.resetThresholds()

			return reply.send(body)
		},
	)
}
