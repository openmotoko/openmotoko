import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

interface DirEntry {
	name: string
	type: 'file' | 'directory'
	children?: DirEntry[]
}

async function listRecursive(dirPath: string): Promise<DirEntry[]> {
	const entries = await readdir(dirPath, { withFileTypes: true })
	const result: DirEntry[] = []

	for (const entry of entries) {
		const fullPath = join(dirPath, entry.name)
		if (entry.isDirectory()) {
			result.push({
				name: entry.name,
				type: 'directory',
				children: await listRecursive(fullPath),
			})
		} else {
			result.push({ name: entry.name, type: 'file' })
		}
	}

	return result
}

export const filesystem = defineSkill(manifest, async (toolName, args, ctx) => {
	switch (toolName) {
		case 'read_file': {
			const path = args.path as string
			ctx.log(`Reading file: ${path}`)
			try {
				const content = await readFile(path, 'utf-8')
				return { success: true, data: { content } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'write_file': {
			const path = args.path as string
			const content = args.content as string
			ctx.log(`Writing file: ${path}`)
			try {
				await mkdir(dirname(path), { recursive: true })
				await writeFile(path, content, 'utf-8')
				return { success: true, data: { bytesWritten: Buffer.byteLength(content) } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'list_directory': {
			const path = args.path as string
			const recursive = (args.recursive as boolean | undefined) ?? false
			ctx.log(`Listing directory: ${path}`)
			try {
				if (recursive) {
					const entries = await listRecursive(path)
					return { success: true, data: { entries } }
				}
				const dirEntries = await readdir(path, { withFileTypes: true })
				const entries: DirEntry[] = dirEntries.map((e) => ({
					name: e.name,
					type: e.isDirectory() ? ('directory' as const) : ('file' as const),
				}))
				return { success: true, data: { entries } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		default:
			return { success: false, error: `Unknown tool: ${toolName}` }
	}
})
