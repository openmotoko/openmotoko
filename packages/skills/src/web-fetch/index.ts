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

export const webFetch = defineSkill(manifest, async (toolName, args, ctx) => {
	switch (toolName) {
		case 'fetch_url': {
			const url = args.url as string
			const method = (args.method as string | undefined) ?? 'GET'
			const headers = (args.headers as Record<string, string> | undefined) ?? {}
			const body = args.body as string | undefined
			ctx.log(`Fetching: ${method} ${url}`)

			try {
				const response = await fetch(url, {
					method,
					headers,
					body: body ?? undefined,
				})
				const responseBody = await response.text()
				const responseHeaders: Record<string, string> = {}
				response.headers.forEach((value, key) => {
					responseHeaders[key] = value
				})

				return {
					success: response.ok,
					data: {
						status: response.status,
						statusText: response.statusText,
						headers: responseHeaders,
						body: responseBody,
					},
				}
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'extract_content': {
			const url = args.url as string
			ctx.log(`Extracting content from: ${url}`)

			try {
				const response = await fetch(url)
				const html = await response.text()
				const text = stripHtml(html)
				return {
					success: true,
					data: {
						url,
						status: response.status,
						content: text,
						length: text.length,
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
