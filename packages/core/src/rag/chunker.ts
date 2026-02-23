interface Chunk {
	content: string
	index: number
	tokenEstimate: number
}

function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4)
}

export function chunkText(
	text: string,
	options?: { chunkSize?: number; chunkOverlap?: number; source?: string },
): Chunk[] {
	const chunkSize = options?.chunkSize ?? 512
	const overlap = options?.chunkOverlap ?? 64
	const chunks: Chunk[] = []

	const paragraphs = text.split(/\n\s*\n/)
	let buffer = ''
	let index = 0

	for (const para of paragraphs) {
		const combined = buffer ? `${buffer}\n\n${para}` : para
		if (estimateTokens(combined) > chunkSize && buffer) {
			chunks.push({
				content: buffer.trim(),
				index,
				tokenEstimate: estimateTokens(buffer),
			})
			index++

			const words = buffer.split(/\s+/)
			const overlapWords = words.slice(-overlap)
			buffer = `${overlapWords.join(' ')}\n\n${para}`
		} else {
			buffer = combined
		}
	}

	if (buffer.trim()) {
		chunks.push({
			content: buffer.trim(),
			index,
			tokenEstimate: estimateTokens(buffer),
		})
	}

	return chunks
}
