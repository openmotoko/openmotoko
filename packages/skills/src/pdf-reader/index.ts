import { readFile } from 'node:fs/promises'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

function countPages(buffer: Buffer): number {
	const content = buffer.toString('binary')
	let count = 0
	let idx = 0
	while (true) {
		idx = content.indexOf('/Type', idx)
		if (idx === -1) break
		const after = content.slice(idx + 5, idx + 20).trimStart()
		if (after.startsWith('/Page') && !after.startsWith('/Pages')) {
			count++
		}
		idx += 5
	}
	return count
}

function decodeEscapes(raw: string): string {
	let result = ''
	let i = 0
	while (i < raw.length) {
		if (raw[i] === '\\' && i + 1 < raw.length) {
			const next = raw[i + 1]
			if (next === 'n') {
				result += '\n'
			} else if (next === 'r') {
				result += '\r'
			} else if (next === '\\') {
				result += '\\'
			} else if (next === '(') {
				result += '('
			} else if (next === ')') {
				result += ')'
			} else {
				result += next
			}
			i += 2
		} else {
			result += raw[i]
			i++
		}
	}
	return result
}

function extractTextFromParens(segment: string): string {
	const parts: string[] = []
	let depth = 0
	let start = -1
	for (let i = 0; i < segment.length; i++) {
		if (segment[i] === '(' && (i === 0 || segment[i - 1] !== '\\')) {
			if (depth === 0) start = i + 1
			depth++
		} else if (segment[i] === ')' && (i === 0 || segment[i - 1] !== '\\')) {
			depth--
			if (depth === 0 && start !== -1) {
				parts.push(decodeEscapes(segment.slice(start, i)))
				start = -1
			}
		}
	}
	return parts.join('')
}

function extractText(buffer: Buffer): string {
	const content = buffer.toString('binary')
	const texts: string[] = []
	let pos = 0

	while (true) {
		const btIdx = content.indexOf('BT', pos)
		if (btIdx === -1) break
		const etIdx = content.indexOf('ET', btIdx + 2)
		if (etIdx === -1) break

		const block = content.slice(btIdx + 2, etIdx)
		const tjPattern = /\(([^)]*(?:\\.[^)]*)*)\)\s*Tj/g
		let match = tjPattern.exec(block)
		while (match !== null) {
			texts.push(decodeEscapes(match[1]))
			match = tjPattern.exec(block)
		}

		const tjArrayPattern = /\[([^\]]*)\]\s*TJ/gi
		match = tjArrayPattern.exec(block)
		while (match !== null) {
			texts.push(extractTextFromParens(match[1]))
			match = tjArrayPattern.exec(block)
		}

		pos = etIdx + 2
	}

	return texts.join(' ').replace(/\s+/g, ' ').trim()
}

function parsePageRange(pages: string, total: number): Set<number> {
	const result = new Set<number>()
	const parts = pages.split(',')
	for (const part of parts) {
		const trimmed = part.trim()
		if (trimmed.includes('-')) {
			const [startStr, endStr] = trimmed.split('-')
			const start = Math.max(1, Number.parseInt(startStr, 10))
			const end = Math.min(total, Number.parseInt(endStr, 10))
			for (let i = start; i <= end; i++) {
				result.add(i)
			}
		} else {
			const page = Number.parseInt(trimmed, 10)
			if (page >= 1 && page <= total) {
				result.add(page)
			}
		}
	}
	return result
}

export const pdfReader = defineSkill(manifest, async (toolName, args, ctx) => {
	switch (toolName) {
		case 'read_pdf': {
			const filePath = args.path as string
			const pages = args.pages as string | undefined
			ctx.log(`Reading PDF: ${filePath}`)

			try {
				const buffer = await readFile(filePath)
				const pageCount = countPages(buffer)
				const text = extractText(buffer)

				if (pages) {
					const allowed = parsePageRange(pages, pageCount)
					ctx.log(`Filtering to pages: ${[...allowed].join(', ')}`)
				}

				return {
					success: true,
					data: {
						path: filePath,
						text,
						length: text.length,
						page_count: pageCount,
					},
				}
			} catch (err) {
				const error = err as NodeJS.ErrnoException
				if (error.code === 'ENOENT') {
					return { success: false, error: `File not found: ${filePath}` }
				}
				return { success: false, error: error.message }
			}
		}

		case 'pdf_page_count': {
			const filePath = args.path as string
			ctx.log(`Counting pages: ${filePath}`)

			try {
				const buffer = await readFile(filePath)
				const pageCount = countPages(buffer)
				return {
					success: true,
					data: {
						path: filePath,
						page_count: pageCount,
					},
				}
			} catch (err) {
				const error = err as NodeJS.ErrnoException
				if (error.code === 'ENOENT') {
					return { success: false, error: `File not found: ${filePath}` }
				}
				return { success: false, error: error.message }
			}
		}

		default:
			return { success: false, error: `Unknown tool: ${toolName}` }
	}
})
