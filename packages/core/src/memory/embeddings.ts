const EMBEDDING_DIM = 384

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^\w\s]/g, ' ')
		.split(/\s+/)
		.filter((t) => t.length > 1)
}

function hashToken(token: string): number {
	let hash = 0
	for (let i = 0; i < token.length; i++) {
		hash = ((hash << 5) - hash + token.charCodeAt(i)) | 0
	}
	return Math.abs(hash) % EMBEDDING_DIM
}

export function embed(text: string): Float32Array {
	const vec = new Float32Array(EMBEDDING_DIM)
	const tokens = tokenize(text)
	if (tokens.length === 0) return vec

	for (const token of tokens) {
		const idx = hashToken(token)
		vec[idx] += 1
	}

	let norm = 0
	for (let i = 0; i < EMBEDDING_DIM; i++) {
		norm += vec[i] * vec[i]
	}
	norm = Math.sqrt(norm)
	if (norm > 0) {
		for (let i = 0; i < EMBEDDING_DIM; i++) {
			vec[i] /= norm
		}
	}

	return vec
}

export function embeddingToBuffer(vec: Float32Array): Buffer {
	return Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength)
}

export function bufferToEmbedding(buf: Buffer): Float32Array {
	return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)
}

export function breScore(
	query: Float32Array,
	candidate: Float32Array,
	magnitudePenalty = 0.1,
): number {
	let dot = 0
	let candidateMag = 0
	for (let i = 0; i < query.length; i++) {
		dot += query[i] * candidate[i]
		candidateMag += candidate[i] * candidate[i]
	}
	return dot - magnitudePenalty * Math.sqrt(candidateMag)
}

export const EMBEDDING_DIMENSIONS = EMBEDDING_DIM
