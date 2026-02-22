import { randomBytes } from 'node:crypto'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

export const webhooks = sqliteTable('webhooks', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	name: text().notNull(),
	secret: text()
		.notNull()
		.$defaultFn(() => randomBytes(32).toString('hex')),
	enabled: integer().notNull().default(1),
	targetConversationId: text(),
	handler: text().notNull().default('default'),
	lastTriggeredAt: integer(),
	createdAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export type WebhookRow = typeof webhooks.$inferSelect
export type NewWebhookRow = typeof webhooks.$inferInsert
