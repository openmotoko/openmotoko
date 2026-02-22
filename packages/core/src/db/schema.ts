import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

export const conversations = sqliteTable('conversations', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	title: text().notNull(),
	model: text(),
	systemPrompt: text(),
	channelId: text(),
	createdAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
	updatedAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export const messages = sqliteTable('messages', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	conversationId: text()
		.notNull()
		.references(() => conversations.id),
	role: text().notNull(),
	content: text().notNull(),
	toolCalls: text(),
	toolResults: text(),
	tokens: integer().notNull().default(0),
	cost: real().notNull().default(0),
	model: text(),
	provider: text(),
	createdAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export const activity = sqliteTable('activity', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	type: text().notNull(),
	conversationId: text(),
	channel: text(),
	skillId: text(),
	data: text().notNull(),
	createdAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export const skills = sqliteTable('skills', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	name: text().notNull(),
	version: text().notNull(),
	description: text().notNull(),
	manifest: text().notNull(),
	enabled: integer().notNull().default(1),
	installedAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export const channels = sqliteTable('channels', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	type: text().notNull(),
	config: text().notNull(),
	enabled: integer().notNull().default(1),
	createdAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export const settings = sqliteTable('settings', {
	key: text().primaryKey(),
	value: text().notNull(),
	updatedAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export const costLog = sqliteTable('cost_log', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	conversationId: text(),
	provider: text().notNull(),
	model: text().notNull(),
	inputTokens: integer().notNull(),
	outputTokens: integer().notNull(),
	cost: real().notNull(),
	createdAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export const agents = sqliteTable('agents', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	parentId: text(),
	name: text().notNull(),
	role: text().notNull(),
	model: text().notNull(),
	systemPrompt: text().notNull(),
	status: text().notNull().default('idle'),
	budget: real().notNull().default(1.0),
	spent: real().notNull().default(0),
	conversationId: text().notNull(),
	createdAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
	completedAt: integer(),
})

export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type Activity = typeof activity.$inferSelect
export type NewActivity = typeof activity.$inferInsert
export type Skill = typeof skills.$inferSelect
export type NewSkill = typeof skills.$inferInsert
export type Channel = typeof channels.$inferSelect
export type NewChannel = typeof channels.$inferInsert
export type Setting = typeof settings.$inferSelect
export type NewSetting = typeof settings.$inferInsert
export type CostLogEntry = typeof costLog.$inferSelect
export type NewCostLogEntry = typeof costLog.$inferInsert
export type Agent = typeof agents.$inferSelect
export type NewAgent = typeof agents.$inferInsert
