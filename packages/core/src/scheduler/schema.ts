import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

export const scheduledTasks = sqliteTable('scheduled_tasks', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	name: text().notNull(),
	description: text().notNull().default(''),
	cron: text().notNull(),
	enabled: integer().notNull().default(1),
	handler: text().notNull(),
	payload: text().notNull().default('{}'),
	lastRunAt: integer(),
	nextRunAt: integer(),
	status: text().notNull().default('pending'),
	retryCount: integer().notNull().default(0),
	maxRetries: integer().notNull().default(3),
	createdAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export const taskRuns = sqliteTable('task_runs', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	taskId: text().notNull(),
	success: integer().notNull(),
	output: text(),
	error: text(),
	duration: real().notNull(),
	createdAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export type ScheduledTaskRow = typeof scheduledTasks.$inferSelect
export type NewScheduledTask = typeof scheduledTasks.$inferInsert
export type TaskRunRow = typeof taskRuns.$inferSelect
export type NewTaskRun = typeof taskRuns.$inferInsert
