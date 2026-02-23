import { eq } from 'drizzle-orm'
import { getDb } from '../db/client.js'
import { breScore, bufferToEmbedding, embed, embeddingToBuffer } from './embeddings.js'
import type { SemanticMemoryRow } from './schema.js'
import { semanticMemory } from './schema.js'

interface SemanticEntry {
	fact: string
	category?: string
	source?: string
	confidence?: number
	conversationId?: string
}

interface SearchResult {
	entry: SemanticMemoryRow
	score: number
}

export class SemanticMemoryStore {
	async store(entry: SemanticEntry): Promise<string> {
		const db = getDb()
		const vec = embed(entry.fact)

		const existing = this.findDuplicate(entry.fact)
		if (existing) {
			db.update(semanticMemory)
				.set({
					fact: entry.fact,
					confidence: entry.confidence ?? existing.confidence,
					updatedAt: Date.now(),
				})
				.where(eq(semanticMemory.id, existing.id))
				.run()
			return existing.id
		}

		const [row] = db
			.insert(semanticMemory)
			.values({
				fact: entry.fact,
				category: entry.category ?? 'general',
				source: entry.source ?? 'conversation',
				confidence: entry.confidence ?? 1.0,
				embedding: embeddingToBuffer(vec),
				conversationId: entry.conversationId,
			})
			.returning()
			.all()

		return row.id
	}

	private findDuplicate(fact: string): SemanticMemoryRow | null {
		const db = getDb()
		const all = db.select().from(semanticMemory).all()
		const queryVec = embed(fact)

		for (const row of all) {
			if (!row.embedding) continue
			const rowVec = bufferToEmbedding(row.embedding as Buffer)
			const score = breScore(queryVec, rowVec)
			if (score > 0.9) return row
		}
		return null
	}

	async search(query: string, limit = 10): Promise<SearchResult[]> {
		const db = getDb()
		const queryVec = embed(query)
		const all = db.select().from(semanticMemory).all()

		const scored: SearchResult[] = []
		for (const row of all) {
			if (!row.embedding) continue
			const rowVec = bufferToEmbedding(row.embedding as Buffer)
			const score = breScore(queryVec, rowVec)
			scored.push({ entry: row, score })
		}

		scored.sort((a, b) => b.score - a.score)
		return scored.slice(0, limit)
	}

	async getByCategory(category: string): Promise<SemanticMemoryRow[]> {
		const db = getDb()
		return db.select().from(semanticMemory).where(eq(semanticMemory.category, category)).all()
	}

	async remove(id: string): Promise<void> {
		const db = getDb()
		db.delete(semanticMemory).where(eq(semanticMemory.id, id)).run()
	}

	async getAll(): Promise<SemanticMemoryRow[]> {
		const db = getDb()
		return db.select().from(semanticMemory).all()
	}
}
