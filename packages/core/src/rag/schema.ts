import { blob, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

export const ragDocuments = sqliteTable('rag_documents', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	content: text().notNull(),
	source: text().notNull(),
	chunkIndex: integer().notNull().default(0),
	metadata: text().notNull().default('{}'),
	embedding: blob({ mode: 'buffer' }),
	tokenCount: integer().notNull().default(0),
	createdAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export type RagDocumentRow = typeof ragDocuments.$inferSelect
