import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

export const autonomyRules = sqliteTable('autonomy_rules', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	pattern: text().notNull(),
	level: text().notNull().default('propose'),
	approvalCount: integer().notNull().default(0),
	rejectionCount: integer().notNull().default(0),
	overriddenByUser: integer().notNull().default(0),
	lastUpdated: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export type AutonomyRuleRow = typeof autonomyRules.$inferSelect
