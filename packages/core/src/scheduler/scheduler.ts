import { and, desc, eq, lte, ne } from 'drizzle-orm'
import { getDb } from '../db/index.js'
import { eventBus } from '../events/index.js'
import { getNextRun } from './cron.js'
import { scheduledTasks, taskRuns } from './schema.js'
import type { TaskHandler } from './types.js'

export class Scheduler {
	private interval: ReturnType<typeof setInterval> | null = null
	private handlers = new Map<string, TaskHandler>()
	private running = false

	registerHandler(name: string, fn: TaskHandler) {
		this.handlers.set(name, fn)
	}

	getRegisteredHandlers(): string[] {
		return [...this.handlers.keys()]
	}

	start() {
		if (this.running) return
		this.running = true
		this.tick()
		this.interval = setInterval(() => this.tick(), 30_000)
	}

	stop() {
		this.running = false
		if (this.interval) {
			clearInterval(this.interval)
			this.interval = null
		}
	}

	private async tick() {
		const db = getDb()
		const now = Date.now()

		const dueTasks = await db
			.select()
			.from(scheduledTasks)
			.where(
				and(
					eq(scheduledTasks.enabled, 1),
					lte(scheduledTasks.nextRunAt, now),
					ne(scheduledTasks.status, 'running'),
					ne(scheduledTasks.status, 'cancelled'),
				),
			)

		for (const task of dueTasks) {
			this.executeTask(task)
		}
	}

	async executeTask(task: typeof scheduledTasks.$inferSelect) {
		const db = getDb()
		const handler = this.handlers.get(task.handler)

		if (!handler) {
			await db
				.update(scheduledTasks)
				.set({ status: 'failed' })
				.where(eq(scheduledTasks.id, task.id))
			return
		}

		await db
			.update(scheduledTasks)
			.set({ status: 'running', lastRunAt: Date.now() })
			.where(eq(scheduledTasks.id, task.id))

		eventBus.emit('scheduler:started', {
			type: 'scheduler:started',
			taskId: task.id,
			taskName: task.name,
		})

		const start = Date.now()
		try {
			const payload = JSON.parse(task.payload || '{}') as Record<string, unknown>
			const output = await handler(payload)
			const duration = Date.now() - start

			await db.insert(taskRuns).values({
				taskId: task.id,
				success: 1,
				output: JSON.stringify(output),
				duration,
			})

			const nextRunAt = getNextRun(task.cron).getTime()
			await db
				.update(scheduledTasks)
				.set({ status: 'completed', nextRunAt, retryCount: 0 })
				.where(eq(scheduledTasks.id, task.id))

			eventBus.emit('scheduler:completed', {
				type: 'scheduler:completed',
				taskId: task.id,
				taskName: task.name,
				duration,
			})
		} catch (err) {
			const duration = Date.now() - start
			const error = err instanceof Error ? err.message : String(err)
			const retryCount = task.retryCount + 1

			await db.insert(taskRuns).values({
				taskId: task.id,
				success: 0,
				error,
				duration,
			})

			if (retryCount < task.maxRetries) {
				const backoff = Math.min(300_000, 1000 * 2 ** retryCount)
				const nextRetryAt = Date.now() + backoff
				await db
					.update(scheduledTasks)
					.set({ status: 'pending', retryCount, nextRunAt: nextRetryAt })
					.where(eq(scheduledTasks.id, task.id))
			} else {
				const nextRunAt = getNextRun(task.cron).getTime()
				await db
					.update(scheduledTasks)
					.set({ status: 'failed', retryCount, nextRunAt })
					.where(eq(scheduledTasks.id, task.id))
			}

			eventBus.emit('scheduler:failed', {
				type: 'scheduler:failed',
				taskId: task.id,
				taskName: task.name,
				error,
			})
		}
	}

	async runManually(taskId: string) {
		const db = getDb()
		const [task] = await db.select().from(scheduledTasks).where(eq(scheduledTasks.id, taskId))

		if (!task) throw new Error('Task not found')
		await this.executeTask(task)
	}

	async getRunHistory(taskId: string, limit = 20) {
		const db = getDb()
		return db
			.select()
			.from(taskRuns)
			.where(eq(taskRuns.taskId, taskId))
			.orderBy(desc(taskRuns.createdAt))
			.limit(limit)
	}
}

export const scheduler = new Scheduler()
