import { readFile } from 'node:fs/promises'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

let browser: unknown = null
let page: unknown = null

async function getPage(): Promise<{
	goto(url: string, opts?: { waitUntil?: string }): Promise<{ status(): number } | null>
	url(): string
	title(): Promise<string>
	click(selector: string): Promise<void>
	fill(selector: string, text: string): Promise<void>
	screenshot(opts?: { type?: string; fullPage?: boolean }): Promise<Buffer>
	isClosed(): boolean
}> {
	if (page && (page as { isClosed(): boolean }).isClosed() === false) {
		return page as Awaited<ReturnType<typeof getPage>>
	}

	let pw: {
		chromium: { launch(opts: { headless: boolean }): Promise<{ newPage(): Promise<unknown> }> }
	}
	try {
		// @ts-expect-error playwright is an optional peer dependency
		pw = await import('playwright')
	} catch {
		throw new Error(
			'playwright is not installed. Run: pnpm add playwright && npx playwright install chromium',
		)
	}

	browser = await pw.chromium.launch({ headless: true })
	page = await (browser as { newPage(): Promise<unknown> }).newPage()
	return page as Awaited<ReturnType<typeof getPage>>
}

export const browserControl = defineSkill(manifest, async (toolName, args, ctx) => {
	switch (toolName) {
		case 'navigate': {
			const url = args.url as string
			ctx.log(`Navigating to: ${url}`)
			try {
				const p = await getPage()
				const response = await p.goto(url, { waitUntil: 'domcontentloaded' })
				return {
					success: true,
					data: {
						url: p.url(),
						title: await p.title(),
						status: response?.status(),
					},
				}
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'click': {
			const selector = args.selector as string
			ctx.log(`Clicking: ${selector}`)
			try {
				const p = await getPage()
				await p.click(selector)
				return { success: true, data: { clicked: selector } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'type': {
			const selector = args.selector as string
			const text = args.text as string
			ctx.log(`Typing into: ${selector}`)
			try {
				const p = await getPage()
				await p.fill(selector, text)
				return { success: true, data: { selector, textLength: text.length } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'screenshot': {
			ctx.log('Taking screenshot')
			try {
				const p = await getPage()
				const buffer = await p.screenshot({ type: 'png', fullPage: true })
				return {
					success: true,
					data: {
						base64: buffer.toString('base64'),
						mimeType: 'image/png',
						url: p.url(),
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
