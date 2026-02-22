import { readFile } from 'node:fs/promises'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

interface SearchResult {
	title: string
	url: string
	snippet: string
}

function parseSearchResults(html: string, limit: number): SearchResult[] {
	const results: SearchResult[] = []
	const resultBlocks = html.split('<div class="result results_links results_links_deep web-result')

	for (let i = 1; i < resultBlocks.length && results.length < limit; i++) {
		const block = resultBlocks[i]
		const titleMatch = block.match(
			/<a[^>]+href="([^"]*)"[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/,
		)
		const snippetMatch = block.match(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/)

		if (titleMatch) {
			results.push({
				title: titleMatch[2].replace(/<[^>]+>/g, '').trim(),
				url: titleMatch[1],
				snippet: snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '',
			})
		}
	}

	if (results.length === 0) {
		const linkPattern = /<a[^>]+href="(https?:\/\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g
		const seen = new Set<string>()
		let match = linkPattern.exec(html)

		while (match !== null && results.length < limit) {
			const url = match[1]
			const title = match[2].replace(/<[^>]+>/g, '').trim()
			if (title.length > 2 && !seen.has(url) && !url.includes('duckduckgo.com')) {
				seen.add(url)
				results.push({ title, url, snippet: '' })
			}
			match = linkPattern.exec(html)
		}
	}

	return results
}

export const webSearch = defineSkill(manifest, async (toolName, args, ctx) => {
	if (toolName !== 'search_web') {
		return { success: false, error: `Unknown tool: ${toolName}` }
	}

	const query = args.query as string
	const limit = (args.limit as number | undefined) ?? 10
	ctx.log(`Searching: ${query}`)

	try {
		const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; OpenMotoko/0.1; +https://openmotoko.ai)',
			},
		})
		const html = await response.text()
		const results = parseSearchResults(html, limit)

		return {
			success: true,
			data: { query, results, count: results.length },
		}
	} catch (err) {
		return { success: false, error: (err as Error).message }
	}
})
