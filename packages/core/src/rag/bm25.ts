const K1 = 1.2
const B = 0.75

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^\w\s]/g, ' ')
		.split(/\s+/)
		.filter((t) => t.length > 1)
}

export class BM25Index {
	private docs: { id: string; tokens: string[]; length: number }[] = []
	private avgDl = 0
	private df = new Map<string, number>()

	addDocument(id: string, text: string): void {
		const tokens = tokenize(text)
		this.docs.push({ id, tokens, length: tokens.length })
		this.rebuildStats()
	}

	addDocuments(documents: { id: string; text: string }[]): void {
		for (const doc of documents) {
			const tokens = tokenize(doc.text)
			this.docs.push({ id: doc.id, tokens, length: tokens.length })
		}
		this.rebuildStats()
	}

	private rebuildStats(): void {
		this.df.clear()
		let totalLength = 0

		for (const doc of this.docs) {
			totalLength += doc.length
			const seen = new Set<string>()
			for (const token of doc.tokens) {
				if (!seen.has(token)) {
					seen.add(token)
					this.df.set(token, (this.df.get(token) ?? 0) + 1)
				}
			}
		}

		this.avgDl = this.docs.length > 0 ? totalLength / this.docs.length : 0
	}

	search(query: string, limit = 10): { id: string; score: number }[] {
		const queryTokens = tokenize(query)
		const n = this.docs.length
		const scores: { id: string; score: number }[] = []

		for (const doc of this.docs) {
			let score = 0
			const tf = new Map<string, number>()
			for (const token of doc.tokens) {
				tf.set(token, (tf.get(token) ?? 0) + 1)
			}

			for (const term of queryTokens) {
				const termTf = tf.get(term) ?? 0
				if (termTf === 0) continue

				const termDf = this.df.get(term) ?? 0
				const idf = Math.log((n - termDf + 0.5) / (termDf + 0.5) + 1)
				const tfNorm = (termTf * (K1 + 1)) / (termTf + K1 * (1 - B + B * (doc.length / this.avgDl)))
				score += idf * tfNorm
			}

			if (score > 0) {
				scores.push({ id: doc.id, score })
			}
		}

		scores.sort((a, b) => b.score - a.score)
		return scores.slice(0, limit)
	}

	clear(): void {
		this.docs = []
		this.df.clear()
		this.avgDl = 0
	}
}
