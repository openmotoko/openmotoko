import { readFile } from 'node:fs/promises'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

function stripHtml(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<style[\s\S]*?<\/style>/gi, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, ' ')
		.trim()
}

function splitSentences(text: string): string[] {
	return text
		.split(/(?<=[.!?])\s+/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0)
}

function buildWordFrequency(sentences: string[]): Map<string, number> {
	const freq = new Map<string, number>()
	for (const sentence of sentences) {
		const words = sentence.toLowerCase().split(/\s+/)
		for (const word of words) {
			const cleaned = word.replace(/[^a-z0-9]/g, '')
			if (cleaned.length < 4) continue
			freq.set(cleaned, (freq.get(cleaned) ?? 0) + 1)
		}
	}
	return freq
}

function scoreSentence(sentence: string, freq: Map<string, number>): number {
	const words = sentence.toLowerCase().split(/\s+/)
	let score = 0
	for (const word of words) {
		const cleaned = word.replace(/[^a-z0-9]/g, '')
		score += freq.get(cleaned) ?? 0
	}
	return score
}

function extractSummary(text: string, maxLength: number): string {
	const sentences = splitSentences(text)
	if (sentences.length === 0) return text.slice(0, maxLength)

	const freq = buildWordFrequency(sentences)
	const scored = sentences.map((sentence, index) => ({
		sentence,
		index,
		score: scoreSentence(sentence, freq),
	}))

	scored.sort((a, b) => b.score - a.score)

	const selected: { sentence: string; index: number }[] = []
	let totalLength = 0

	for (const item of scored) {
		if (totalLength + item.sentence.length > maxLength) continue
		selected.push(item)
		totalLength += item.sentence.length + 1
	}

	selected.sort((a, b) => a.index - b.index)
	return selected.map((s) => s.sentence).join(' ')
}

export const summarize = defineSkill(manifest, async (toolName, args, ctx) => {
	switch (toolName) {
		case 'summarize_text': {
			const text = args.text as string
			const maxLength = (args.max_length as number | undefined) ?? 500
			ctx.log(`Summarizing text (${text.length} chars)`)

			const summary = extractSummary(text, maxLength)
			return {
				success: true,
				data: {
					summary,
					original_length: text.length,
					summary_length: summary.length,
				},
			}
		}

		case 'summarize_url': {
			const url = args.url as string
			const maxLength = (args.max_length as number | undefined) ?? 500
			ctx.log(`Fetching and summarizing: ${url}`)

			try {
				const response = await fetch(url)
				const html = await response.text()
				const text = stripHtml(html)
				const summary = extractSummary(text, maxLength)
				return {
					success: true,
					data: {
						url,
						summary,
						original_length: text.length,
						summary_length: summary.length,
					},
				}
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		default:
			return { success: false, error: `Unknown tool: ${toolName}` }
	}
})
