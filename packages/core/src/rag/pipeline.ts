import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { getDb } from '../db/client.js'
import { breScore, bufferToEmbedding, embed, embeddingToBuffer } from '../memory/embeddings.js'
import { BM25Index } from './bm25.js'
import { chunkText } from './chunker.js'
import { ragDocuments } from './schema.js'
import type { IngestOptions, SearchOptions, SearchResult } from './types.js'

export class RAGPipeline {
	private bm25 = new BM25Index()
	private initialized = false

	async initialize(): Promise<void> {
		if (this.initialized) return
		const db = getDb()
		const docs = db.select().from(ragDocuments).all()
		this.bm25.addDocuments(docs.map((d) => ({ id: d.id, text: d.content })))
		this.initialized = true
	}

	async ingest(text: string, options: IngestOptions): Promise<string[]> {
		const db = getDb()
		const chunks = chunkText(text, {
			chunkSize: options.chunkSize,
			chunkOverlap: options.chunkOverlap,
			source: options.source,
		})

		const ids: string[] = []

		for (const chunk of chunks) {
			const id = nanoid()
			const vec = embed(chunk.content)

			db.insert(ragDocuments)
				.values({
					id,
					content: chunk.content,
					source: options.source,
					chunkIndex: chunk.index,
					metadata: JSON.stringify(options.metadata ?? {}),
					embedding: embeddingToBuffer(vec),
					tokenCount: chunk.tokenEstimate,
				})
				.run()

			this.bm25.addDocument(id, chunk.content)
			ids.push(id)
		}

		return ids
	}

	async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
		await this.initialize()

		const limit = options?.limit ?? 10
		const minScore = options?.minScore ?? 0.05
		const alpha = options?.hybridAlpha ?? 0.7

		const db = getDb()
		const allDocs = db.select().from(ragDocuments).all()

		const queryVec = embed(query)
		const vectorScores = new Map<string, number>()

		for (const doc of allDocs) {
			if (!doc.embedding) continue
			if (options?.sources?.length && !options.sources.includes(doc.source)) continue
			const docVec = bufferToEmbedding(doc.embedding as Buffer)
			const score = breScore(queryVec, docVec)
			vectorScores.set(doc.id, score)
		}

		const bm25Results = this.bm25.search(query, limit * 2)
		const bm25Scores = new Map(bm25Results.map((r) => [r.id, r.score]))

		const maxVector = Math.max(...vectorScores.values(), 0.001)
		const maxBm25 = Math.max(...bm25Scores.values(), 0.001)

		const combined = new Map<string, { score: number; matchType: SearchResult['matchType'] }>()

		for (const [id, score] of vectorScores) {
			const normVector = score / maxVector
			const normBm25 = (bm25Scores.get(id) ?? 0) / maxBm25
			const hybrid = alpha * normVector + (1 - alpha) * normBm25
			combined.set(id, {
				score: hybrid,
				matchType: bm25Scores.has(id) ? 'hybrid' : 'vector',
			})
		}

		for (const [id, score] of bm25Scores) {
			if (!combined.has(id)) {
				const normBm25 = score / maxBm25
				combined.set(id, {
					score: (1 - alpha) * normBm25,
					matchType: 'bm25',
				})
			}
		}

		const docMap = new Map(allDocs.map((d) => [d.id, d]))
		const results: SearchResult[] = []

		for (const [id, { score, matchType }] of combined) {
			if (score < minScore) continue
			const doc = docMap.get(id)
			if (!doc) continue

			results.push({
				document: {
					id: doc.id,
					content: doc.content,
					metadata: JSON.parse(doc.metadata),
					source: doc.source,
					chunkIndex: doc.chunkIndex,
				},
				score,
				matchType,
			})
		}

		results.sort((a, b) => b.score - a.score)
		return results.slice(0, limit)
	}

	async removeBySource(source: string): Promise<number> {
		const db = getDb()
		const result = db.delete(ragDocuments).where(eq(ragDocuments.source, source)).run()

		this.initialized = false
		return result.changes
	}

	async getDocumentCount(): Promise<number> {
		const db = getDb()
		return db.select().from(ragDocuments).all().length
	}

	async getSources(): Promise<string[]> {
		const db = getDb()
		const docs = db.select({ source: ragDocuments.source }).from(ragDocuments).all()
		return [...new Set(docs.map((d) => d.source))]
	}

	buildContextFromResults(results: SearchResult[]): string {
		if (results.length === 0) return ''
		return results
			.map((r) => `[Source: ${r.document.source}]\n${r.document.content}`)
			.join('\n\n---\n\n')
	}
}

let instance: RAGPipeline | null = null

export function getRAGPipeline(): RAGPipeline {
	if (!instance) {
		instance = new RAGPipeline()
	}
	return instance
}
