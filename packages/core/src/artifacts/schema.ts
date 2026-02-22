import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'
import { conversations } from '../db/schema.js'

export const artifacts = sqliteTable('artifacts', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	conversationId: text()
		.notNull()
		.references(() => conversations.id),
	type: text().notNull(),
	title: text().notNull(),
	content: text().notNull(),
	language: text(),
	version: integer().notNull().default(1),
	createdAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
	updatedAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export const artifactVersions = sqliteTable('artifact_versions', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	artifactId: text()
		.notNull()
		.references(() => artifacts.id),
	version: integer().notNull(),
	content: text().notNull(),
	createdAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})
