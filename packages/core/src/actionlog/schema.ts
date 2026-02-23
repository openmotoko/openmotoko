import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

export const actionLog = sqliteTable('action_log', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	intentId: text(),
	action: text().notNull(),
	parameters: text().notNull(),
	result: text().notNull().default('success'),
	approval: text().notNull().default('autonomous'),
	approvedAt: integer(),
	tokenCost: real().notNull().default(0),
	executionDuration: integer().notNull().default(0),
	undoAvailable: integer().notNull().default(0),
	undoDeadline: integer(),
	hmac: text().notNull(),
	createdAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export type ActionLogRow = typeof actionLog.$inferSelect
export type NewActionLog = typeof actionLog.$inferInsert
