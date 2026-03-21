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

		case 'fill_form': {
			const fields = args.fields as Record<string, string>
			const submit = args.submit as boolean | undefined
			ctx.log(`Filling form with ${Object.keys(fields).length} fields`)
			try {
				const p = await getPage()
				for (const [key, value] of Object.entries(fields)) {
					const selectors = [
						`input[name="${key}"]`,
						`input[id="${key}"]`,
						`textarea[name="${key}"]`,
						`select[name="${key}"]`,
						`[aria-label="${key}"]`,
						`label:has-text("${key}") + input`,
						`label:has-text("${key}") + textarea`,
					]
					let filled = false
					for (const sel of selectors) {
						try {
							await p.fill(sel, value)
							filled = true
							break
						} catch {}
					}
					if (!filled) {
						return { success: false, error: `Could not find field: ${key}` }
					}
				}
				if (submit) {
					try {
						await p.click('button[type="submit"], input[type="submit"]')
					} catch {
						await p.click('form button:last-of-type')
					}
				}
				return { success: true, data: { filledFields: Object.keys(fields), submitted: !!submit } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'extract_data': {
			const selectors = args.selectors as Record<string, string> | undefined
			const tableSelector = args.table_selector as string | undefined
			ctx.log('Extracting data from page')
			try {
				const p = await getPage()
				const result: Record<string, unknown> = {}

				if (selectors) {
					for (const [name, sel] of Object.entries(selectors)) {
						try {
							const el = await (
								p as unknown as { textContent(s: string): Promise<string> }
							).textContent(sel)
							result[name] = el
						} catch {
							result[name] = null
						}
					}
				}

				if (tableSelector) {
					const tableData = await (
						p as unknown as {
							evaluate(fn: (sel: string) => unknown, arg: string): Promise<unknown>
						}
					).evaluate((sel: string) => {
						const table = document.querySelector(sel)
						if (!table) return null
						const rows = Array.from(table.querySelectorAll('tr'))
						return rows.map((row) =>
							Array.from(row.querySelectorAll('th, td')).map(
								(cell) => cell.textContent?.trim() ?? '',
							),
						)
					}, tableSelector)
					result.table = tableData
				}

				return { success: true, data: result }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'extract_links': {
			const selector = args.selector as string | undefined
			ctx.log('Extracting links from page')
			try {
				const p = await getPage()
				const links = await (
					p as unknown as {
						evaluate(fn: (sel?: string) => unknown, arg?: string): Promise<unknown>
					}
				).evaluate((sel?: string) => {
					const scope = sel ? document.querySelector(sel) : document
					if (!scope) return []
					return Array.from(scope.querySelectorAll('a[href]')).map((a) => ({
						text: a.textContent?.trim() ?? '',
						href: (a as HTMLAnchorElement).href,
					}))
				}, selector)
				return { success: true, data: { links } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'get_cookies': {
			ctx.log('Getting cookies')
			try {
				const p = await getPage()
				const context = await (
					p as unknown as { context(): { cookies(): Promise<unknown[]> } }
				).context()
				const cookies = await context.cookies()
				return { success: true, data: { cookies } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'set_cookies': {
			const cookies = args.cookies as {
				name: string
				value: string
				domain?: string
				path?: string
			}[]
			ctx.log(`Setting ${cookies.length} cookies`)
			try {
				const p = await getPage()
				const context = await (
					p as unknown as { context(): { addCookies(c: unknown[]): Promise<void> } }
				).context()
				const url = (p as unknown as { url(): string }).url()
				const domain = new URL(url).hostname
				await context.addCookies(
					cookies.map((c) => ({
						name: c.name,
						value: c.value,
						domain: c.domain ?? domain,
						path: c.path ?? '/',
					})),
				)
				return { success: true, data: { set: cookies.length } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'evaluate': {
			const script = args.script as string
			ctx.log('Evaluating script in page')
			try {
				const p = await getPage()
				const result = await (p as unknown as { evaluate(fn: string): Promise<unknown> }).evaluate(
					script,
				)
				return { success: true, data: { result } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'wait_for': {
			const selector = args.selector as string
			const timeout = (args.timeout as number) ?? 10_000
			ctx.log(`Waiting for: ${selector}`)
			try {
				const p = await getPage()
				await (
					p as unknown as { waitForSelector(s: string, o: { timeout: number }): Promise<unknown> }
				).waitForSelector(selector, { timeout })
				return { success: true, data: { found: selector } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		default:
			return { success: false, error: `Unknown tool: ${toolName}` }
	}
})
