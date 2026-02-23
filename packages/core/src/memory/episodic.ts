import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { getDb } from '../db/client.js'
import { breScore, bufferToEmbedding, embed, embeddingToBuffer } from './embeddings.js'
import type { EpisodicMemoryRow } from './schema.js'
import { episodicMemory } from './schema.js'

interface EpisodicEntry {
	content: string
	summary?: string
	conversationId?: string
	channel?: string
	importance?: number
}

interface EpisodicSearchResult {
	entry: EpisodicMemoryRow
	score: number
}

export class EpisodicMemoryStore {
	async store(entry: EpisodicEntry): Promise<string> {
		const db = getDb()
		const vec = embed(entry.content)

		const [row] = db
			.insert(episodicMemory)
			.values({
				content: entry.content,
				summary: entry.summary,
				conversationId: entry.conversationId,
				channel: entry.channel,
				embedding: embeddingToBuffer(vec),
				importance: entry.importance ?? 0.5,
			})
			.returning()
			.all()

		return row.id
	}

	async search(query: string, limit = 10): Promise<EpisodicSearchResult[]> {
		const db = getDb()
		const queryVec = embed(query)
		const all = db.select().from(episodicMemory).all()

		const scored: EpisodicSearchResult[] = []
		for (const row of all) {
			if (!row.embedding) continue
			const rowVec = bufferToEmbedding(row.embedding as Buffer)
			const score = breScore(queryVec, rowVec)
			scored.push({ entry: row, score })
		}

		scored.sort((a, b) => b.score - a.score)
		return scored.slice(0, limit)
	}

	async getRecent(limit = 50): Promise<EpisodicMemoryRow[]> {
		const db = getDb()
		return db
			.select()
			.from(episodicMemory)
			.orderBy(desc(episodicMemory.timestamp))
			.limit(limit)
			.all()
	}

	async getByTimeRange(start: number, end: number): Promise<EpisodicMemoryRow[]> {
		const db = getDb()
		return db
			.select()
			.from(episodicMemory)
			.where(and(gte(episodicMemory.timestamp, start), lte(episodicMemory.timestamp, end)))
			.orderBy(desc(episodicMemory.timestamp))
			.all()
	}

	async getByConversation(conversationId: string): Promise<EpisodicMemoryRow[]> {
		const db = getDb()
		return db
			.select()
			.from(episodicMemory)
			.where(eq(episodicMemory.conversationId, conversationId))
			.orderBy(desc(episodicMemory.timestamp))
			.all()
	}

	async remove(id: string): Promise<void> {
		const db = getDb()
		db.delete(episodicMemory).where(eq(episodicMemory.id, id)).run()
	}
}
