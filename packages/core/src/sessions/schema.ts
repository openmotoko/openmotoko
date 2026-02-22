import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

export const sessions = sqliteTable('sessions', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	conversationId: text().notNull(),
	channelId: text(),
	senderId: text(),
	model: text(),
	systemPrompt: text(),
	tokenCount: integer().notNull().default(0),
	compactedAt: integer(),
	createdAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
	updatedAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export type SessionRow = typeof sessions.$inferSelect
export type NewSessionRow = typeof sessions.$inferInsert
