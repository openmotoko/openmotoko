import { blob, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

export const semanticMemory = sqliteTable('semantic_memory', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	fact: text().notNull(),
	category: text().notNull().default('general'),
	source: text().notNull().default('conversation'),
	confidence: real().notNull().default(1.0),
	embedding: blob({ mode: 'buffer' }),
	conversationId: text(),
	createdAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
	updatedAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export const episodicMemory = sqliteTable('episodic_memory', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	content: text().notNull(),
	summary: text(),
	conversationId: text(),
	channel: text(),
	embedding: blob({ mode: 'buffer' }),
	importance: real().notNull().default(0.5),
	timestamp: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export const proceduralMemory = sqliteTable('procedural_memory', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	name: text().notNull(),
	description: text().notNull(),
	steps: text().notNull(),
	trigger: text(),
	usageCount: integer().notNull().default(0),
	lastUsedAt: integer(),
	createdAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export const workingMemorySummaries = sqliteTable('working_memory_summaries', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	conversationId: text().notNull(),
	summary: text().notNull(),
	messageCount: integer().notNull().default(0),
	lastMessageAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
	createdAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export type SemanticMemoryRow = typeof semanticMemory.$inferSelect
export type EpisodicMemoryRow = typeof episodicMemory.$inferSelect
export type ProceduralMemoryRow = typeof proceduralMemory.$inferSelect
export type WorkingMemorySummaryRow = typeof workingMemorySummaries.$inferSelect
