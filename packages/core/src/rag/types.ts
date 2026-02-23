export interface Document {
	id: string
	content: string
	metadata: Record<string, unknown>
	source: string
	chunkIndex?: number
}

export interface SearchResult {
	document: Document
	score: number
	matchType: 'vector' | 'bm25' | 'hybrid'
}

export interface IngestOptions {
	source: string
	chunkSize?: number
	chunkOverlap?: number
	metadata?: Record<string, unknown>
}

export interface SearchOptions {
	limit?: number
	minScore?: number
	sources?: string[]
	hybridAlpha?: number
}
