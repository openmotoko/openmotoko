import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, relative } from 'node:path'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

function getVaultPath(env: Record<string, string | undefined>): string {
	const vaultPath = env.OBSIDIAN_VAULT_PATH
	if (!vaultPath) {
		throw new Error('OBSIDIAN_VAULT_PATH environment variable is required')
	}
	return vaultPath
}

function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
	if (!match) {
		return { frontmatter: {}, body: content }
	}

	const yamlBlock = match[1]
	const body = match[2]
	const frontmatter: Record<string, unknown> = {}

	for (const line of yamlBlock.split('\n')) {
		const colonIdx = line.indexOf(':')
		if (colonIdx === -1) continue

		const key = line.slice(0, colonIdx).trim()
		let value: unknown = line.slice(colonIdx + 1).trim()

		if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
			value = value
				.slice(1, -1)
				.split(',')
				.map((v) => v.trim().replace(/^["']|["']$/g, ''))
		} else if (value === 'true') {
			value = true
		} else if (value === 'false') {
			value = false
		} else if (typeof value === 'string' && /^\d+$/.test(value)) {
			value = Number.parseInt(value, 10)
		}

		frontmatter[key] = value
	}

	return { frontmatter, body }
}

function serializeFrontmatter(frontmatter: Record<string, unknown>): string {
	const lines: string[] = []
	for (const [key, value] of Object.entries(frontmatter)) {
		if (Array.isArray(value)) {
			lines.push(`${key}: [${value.map((v) => String(v)).join(', ')}]`)
		} else {
			lines.push(`${key}: ${String(value)}`)
		}
	}
	return `---\n${lines.join('\n')}\n---\n`
}

function extractWikiLinks(content: string): string[] {
	const links: string[] = []
	const regex = /\[\[([^\]|#]+)(?:[#|][^\]]*)?]]/g
	let match: RegExpExecArray | null = regex.exec(content)
	while (match !== null) {
		links.push(match[1].trim())
		match = regex.exec(content)
	}
	return links
}

async function walkMarkdownFiles(dir: string): Promise<string[]> {
	const files: string[] = []

	async function walk(currentDir: string): Promise<void> {
		const entries = await readdir(currentDir, { withFileTypes: true })
		for (const entry of entries) {
			const fullPath = join(currentDir, entry.name)
			if (entry.name.startsWith('.')) continue

			if (entry.isDirectory()) {
				await walk(fullPath)
			} else if (extname(entry.name) === '.md') {
				files.push(fullPath)
			}
		}
	}

	await walk(dir)
	return files
}

export const obsidian = defineSkill(manifest, async (toolName, args, ctx) => {
	let vaultPath: string
	try {
		vaultPath = getVaultPath(ctx.env)
	} catch (err) {
		return { success: false, error: (err as Error).message }
	}

	switch (toolName) {
		case 'list_notes': {
			const folder = args.folder as string | undefined
			const targetDir = folder ? join(vaultPath, folder) : vaultPath
			ctx.log(`Listing notes in: ${relative(vaultPath, targetDir) || 'vault root'}`)

			try {
				const files = await walkMarkdownFiles(targetDir)
				const notes = await Promise.all(
					files.map(async (filePath) => {
						const stats = await stat(filePath)
						return {
							path: relative(vaultPath, filePath),
							name: basename(filePath, '.md'),
							size: stats.size,
							modifiedAt: stats.mtime.toISOString(),
						}
					}),
				)
				notes.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
				return { success: true, data: { notes, count: notes.length } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'read_note': {
			const notePath = args.path as string
			const fullPath = join(vaultPath, notePath)
			ctx.log(`Reading note: ${notePath}`)

			try {
				const raw = await readFile(fullPath, 'utf-8')
				const { frontmatter, body } = parseFrontmatter(raw)
				const wikiLinks = extractWikiLinks(raw)
				return {
					success: true,
					data: {
						path: notePath,
						frontmatter,
						content: body,
						wikiLinks,
					},
				}
			} catch (err) {
				if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
					return { success: false, error: `Note not found: ${notePath}` }
				}
				return { success: false, error: (err as Error).message }
			}
		}

		case 'create_note': {
			const notePath = args.path as string
			const content = args.content as string
			const frontmatter = args.frontmatter as Record<string, unknown> | undefined
			const fullPath = join(vaultPath, notePath)
			ctx.log(`Creating note: ${notePath}`)

			try {
				await mkdir(dirname(fullPath), { recursive: true })

				let fileContent = ''
				if (frontmatter && Object.keys(frontmatter).length > 0) {
					fileContent += serializeFrontmatter(frontmatter)
				}
				fileContent += content

				await writeFile(fullPath, fileContent, 'utf-8')
				return {
					success: true,
					data: {
						path: notePath,
						message: `Note created: ${notePath}`,
					},
				}
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'search_notes': {
			const query = (args.query as string).toLowerCase()
			ctx.log(`Searching notes for: ${query}`)

			try {
				const files = await walkMarkdownFiles(vaultPath)
				const results: Array<Record<string, unknown>> = []

				for (const filePath of files) {
					const relPath = relative(vaultPath, filePath)
					const name = basename(filePath, '.md')
					const nameMatch = name.toLowerCase().includes(query)

					const raw = await readFile(filePath, 'utf-8')
					const contentMatch = raw.toLowerCase().includes(query)

					if (nameMatch || contentMatch) {
						let snippet = ''
						if (contentMatch) {
							const idx = raw.toLowerCase().indexOf(query)
							const start = Math.max(0, idx - 80)
							const end = Math.min(raw.length, idx + query.length + 80)
							snippet =
								(start > 0 ? '...' : '') + raw.slice(start, end) + (end < raw.length ? '...' : '')
						}

						results.push({
							path: relPath,
							name,
							matchType:
								nameMatch && contentMatch ? 'title+content' : nameMatch ? 'title' : 'content',
							snippet,
						})
					}
				}

				return { success: true, data: { results, count: results.length } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'update_note': {
			const notePath = args.path as string
			const content = args.content as string
			const fullPath = join(vaultPath, notePath)
			ctx.log(`Updating note: ${notePath}`)

			try {
				const existing = await readFile(fullPath, 'utf-8')
				const { frontmatter } = parseFrontmatter(existing)

				let fileContent = ''
				if (Object.keys(frontmatter).length > 0) {
					fileContent += serializeFrontmatter(frontmatter)
				}
				fileContent += content

				await writeFile(fullPath, fileContent, 'utf-8')
				return { success: true, data: { path: notePath, message: `Note updated: ${notePath}` } }
			} catch (err) {
				if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
					return { success: false, error: `Note not found: ${notePath}` }
				}
				return { success: false, error: (err as Error).message }
			}
		}

		case 'get_backlinks': {
			const notePath = args.path as string
			const noteName = basename(notePath, '.md')
			ctx.log(`Finding backlinks for: ${notePath}`)

			try {
				const files = await walkMarkdownFiles(vaultPath)
				const backlinks: Array<Record<string, unknown>> = []

				for (const filePath of files) {
					const relPath = relative(vaultPath, filePath)
					if (relPath === notePath) continue

					const raw = await readFile(filePath, 'utf-8')
					const links = extractWikiLinks(raw)

					if (
						links.some(
							(link) =>
								link === noteName || link === notePath || link === notePath.replace(/\.md$/, ''),
						)
					) {
						backlinks.push({
							path: relPath,
							name: basename(filePath, '.md'),
						})
					}
				}

				return { success: true, data: { backlinks, count: backlinks.length } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		default:
			return { success: false, error: `Unknown tool: ${toolName}` }
	}
})
