import { readFile } from 'node:fs/promises'
import { defineSkill, formatError, formatToolResult } from '@openmotoko/skill-sdk'

const raw = await readFile(new URL('./manifest.json', import.meta.url), 'utf-8')
const manifest = JSON.parse(raw)

export default defineSkill(manifest, async (toolName, args, ctx) => {
	ctx.log(`Executing ${toolName}`)

	if (toolName.endsWith('_browse')) {
		try {
			const url = args.url as string
			const selector = args.selector as string | undefined

			ctx.log(`Navigating to ${url}`)
			const res = await fetch(url)
			if (!res.ok) return formatError(`HTTP ${res.status}`)
			const html = await res.text()

			if (selector) {
				ctx.log(`Extracting content for selector: ${selector}`)
			}

			return formatToolResult({
				url,
				title: html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] ?? '',
				content: html.slice(0, 20000),
			})
		} catch (err) {
			return formatError(err)
		}
	}

	return formatError(`Unknown tool: ${toolName}`)
})
