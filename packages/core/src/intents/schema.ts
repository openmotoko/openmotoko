import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

export const intents = sqliteTable('intents', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	source: text().notNull(),
	summary: text().notNull(),
	reasoning: text().notNull(),
	confidence: real().notNull(),
	impact: text().notNull(),
	actions: text().notNull(),
	estimatedCost: real().notNull().default(0),
	requiresApproval: integer().notNull().default(1),
	suggestedResponse: text(),
	alternatives: text(),
	status: text().notNull().default('pending'),
	conversationId: text(),
	channelType: text(),
	resolvedBy: text(),
	resolvedAt: integer(),
	expiresAt: integer(),
	createdAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export type IntentRow = typeof intents.$inferSelect
export type NewIntent = typeof intents.$inferInsert
