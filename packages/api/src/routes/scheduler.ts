import {
	getDb,
	getNextRun,
	isValidCron,
	scheduledTasks,
	scheduler,
	taskRuns,
} from '@openmotoko/core'
import { desc, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'

const taskIdParams = z.object({ id: z.string().min(1) })

const createBodySchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().max(500).default(''),
	cron: z.string().refine(isValidCron, 'Invalid cron expression'),
	handler: z.string().min(1),
	payload: z.record(z.string(), z.unknown()).default({}),
	maxRetries: z.number().int().min(0).max(10).default(3),
})

const updateBodySchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional(),
	cron: z.string().refine(isValidCron, 'Invalid cron expression').optional(),
	handler: z.string().min(1).optional(),
	payload: z.record(z.string(), z.unknown()).optional(),
	maxRetries: z.number().int().min(0).max(10).optional(),
})

const paginationQuery = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(20),
	offset: z.coerce.number().int().min(0).default(0),
})

export default async function schedulerRoutes(fastify: FastifyInstance) {
	fastify.get(
		'/api/scheduler/tasks',
		{ preHandler: validate({ query: paginationQuery }) },
		async (request, reply) => {
			const { limit, offset } = request.query as { limit: number; offset: number }
			const db = getDb()
			const tasks = await db
				.select()
				.from(scheduledTasks)
				.orderBy(desc(scheduledTasks.createdAt))
				.limit(limit)
				.offset(offset)

			const mapped = tasks.map((t) => {
				let payload = {}
				try {
					payload = JSON.parse(t.payload || '{}')
				} catch {}
				return { ...t, enabled: Boolean(t.enabled), payload }
			})
			return reply.send(mapped)
		},
	)

	fastify.post(
		'/api/scheduler/tasks',
		{ preHandler: validate({ body: createBodySchema }) },
		async (request, reply) => {
			const body = request.body as z.infer<typeof createBodySchema>
			const db = getDb()
			const nextRunAt = getNextRun(body.cron).getTime()

			const [task] = await db
				.insert(scheduledTasks)
				.values({
					name: body.name,
					description: body.description,
					cron: body.cron,
					handler: body.handler,
					payload: JSON.stringify(body.payload),
					maxRetries: body.maxRetries,
					nextRunAt,
				})
				.returning()

			let payload = {}
			try {
				payload = JSON.parse(task?.payload || '{}')
			} catch {}
			return reply.status(201).send({
				...task,
				enabled: Boolean(task?.enabled),
				payload,
			})
		},
	)

	fastify.put(
		'/api/scheduler/tasks/:id',
		{ preHandler: validate({ params: taskIdParams, body: updateBodySchema }) },
		async (request, reply) => {
			const { id } = request.params as { id: string }
			const body = request.body as z.infer<typeof updateBodySchema>
			const db = getDb()

			const updates: Record<string, unknown> = {}
			if (body.name !== undefined) updates.name = body.name
			if (body.description !== undefined) updates.description = body.description
			if (body.handler !== undefined) updates.handler = body.handler
			if (body.maxRetries !== undefined) updates.maxRetries = body.maxRetries
			if (body.payload !== undefined) updates.payload = JSON.stringify(body.payload)
			if (body.cron !== undefined) {
				updates.cron = body.cron
				updates.nextRunAt = getNextRun(body.cron).getTime()
			}

			const [updated] = await db
				.update(scheduledTasks)
				.set(updates)
				.where(eq(scheduledTasks.id, id))
				.returning()

			if (!updated) {
				return reply.status(404).send({ error: 'Task not found', code: 'NOT_FOUND' })
			}

			let payload = {}
			try {
				payload = JSON.parse(updated.payload || '{}')
			} catch {}
			return reply.send({
				...updated,
				enabled: Boolean(updated.enabled),
				payload,
			})
		},
	)

	fastify.delete(
		'/api/scheduler/tasks/:id',
		{ preHandler: validate({ params: taskIdParams }) },
		async (request, reply) => {
			const { id } = request.params as { id: string }
			const db = getDb()

			const [task] = await db
				.select()
				.from(scheduledTasks)
				.where(eq(scheduledTasks.id, id))
				.limit(1)

			if (!task) {
				return reply.status(404).send({ error: 'Task not found', code: 'NOT_FOUND' })
			}

			await db.delete(taskRuns).where(eq(taskRuns.taskId, id))
			await db.delete(scheduledTasks).where(eq(scheduledTasks.id, id))
			return reply.status(204).send()
		},
	)

	fastify.post(
		'/api/scheduler/tasks/:id/toggle',
		{ preHandler: validate({ params: taskIdParams }) },
		async (request, reply) => {
			const { id } = request.params as { id: string }
			const db = getDb()

			const [task] = await db.select().from(scheduledTasks).where(eq(scheduledTasks.id, id))

			if (!task) {
				return reply.status(404).send({ error: 'Task not found', code: 'NOT_FOUND' })
			}

			const enabled = task.enabled ? 0 : 1
			const updates: Record<string, unknown> = { enabled }
			if (enabled) {
				updates.nextRunAt = getNextRun(task.cron).getTime()
				updates.status = 'pending'
			} else {
				updates.status = 'cancelled'
			}

			const [updated] = await db
				.update(scheduledTasks)
				.set(updates)
				.where(eq(scheduledTasks.id, id))
				.returning()

			let togglePayload = {}
			try {
				togglePayload = JSON.parse(updated?.payload || '{}')
			} catch {}
			return reply.send({
				...updated,
				enabled: Boolean(updated?.enabled),
				payload: togglePayload,
			})
		},
	)

	fastify.post(
		'/api/scheduler/tasks/:id/run',
		{ preHandler: validate({ params: taskIdParams }) },
		async (request, reply) => {
			const { id } = request.params as { id: string }
			try {
				await scheduler.runManually(id)
				return reply.send({ success: true })
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Unknown error'
				return reply.status(400).send({ error: message, code: 'RUN_FAILED' })
			}
		},
	)

	fastify.get(
		'/api/scheduler/tasks/:id/runs',
		{ preHandler: validate({ params: taskIdParams, query: paginationQuery }) },
		async (request, reply) => {
			const { id } = request.params as { id: string }
			const { limit, offset } = request.query as { limit: number; offset: number }
			const db = getDb()

			const runs = await db
				.select()
				.from(taskRuns)
				.where(eq(taskRuns.taskId, id))
				.orderBy(desc(taskRuns.createdAt))
				.limit(limit)
				.offset(offset)

			const mapped = runs.map((r) => {
				let output = null
				try {
					output = r.output ? JSON.parse(r.output) : null
				} catch {}
				return { ...r, success: Boolean(r.success), output }
			})

			return reply.send(mapped)
		},
	)
}
