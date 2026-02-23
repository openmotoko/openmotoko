import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

interface MemoryEntry {
	content: string
	tags: string[]
	savedAt: string
}

type MemoryStore = Record<string, MemoryEntry>

function getStorePath(): string {
	return process.env.OPENMOTOKO_MEMORY_PATH ?? join(homedir(), '.openmotoko', 'memory.json')
}

async function loadStore(): Promise<MemoryStore> {
	try {
		const raw = await readFile(getStorePath(), 'utf-8')
		return JSON.parse(raw) as MemoryStore
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
			return {}
		}
		throw err
	}
}

async function saveStore(store: MemoryStore): Promise<void> {
	const filePath = getStorePath()
	await mkdir(dirname(filePath), { recursive: true })
	await writeFile(filePath, JSON.stringify(store, null, 2), 'utf-8')
}

export const memory = defineSkill(manifest, async (toolName, args, ctx) => {
	switch (toolName) {
		case 'memory_save': {
			const key = args.key as string
			const content = args.content as string
			const tags = (args.tags as string[] | undefined) ?? []
			ctx.log(`Saving memory: ${key}`)

			try {
				const store = await loadStore()
				const entry: MemoryEntry = {
					content,
					tags,
					savedAt: new Date().toISOString(),
				}
				store[key] = entry
				await saveStore(store)
				return { success: true, data: { key, ...entry } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'memory_search': {
			const query = (args.query as string).toLowerCase()
			ctx.log(`Searching memory: ${query}`)

			try {
				const store = await loadStore()
				const results: Record<string, MemoryEntry> = {}
				for (const [key, entry] of Object.entries(store)) {
					const keyMatch = key.toLowerCase().includes(query)
					const contentMatch = entry.content.toLowerCase().includes(query)
					const tagMatch = entry.tags.some((t) => t.toLowerCase().includes(query))
					if (keyMatch || contentMatch || tagMatch) {
						results[key] = entry
					}
				}
				return { success: true, data: { results, count: Object.keys(results).length } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'memory_list': {
			ctx.log('Listing all memories')

			try {
				const store = await loadStore()
				return { success: true, data: { entries: store, count: Object.keys(store).length } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'memory_delete': {
			const key = args.key as string
			ctx.log(`Deleting memory: ${key}`)

			try {
				const store = await loadStore()
				if (!(key in store)) {
					return { success: false, error: `No entry found for key: ${key}` }
				}
				delete store[key]
				await saveStore(store)
				return { success: true, data: { deleted: key } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		default:
			return { success: false, error: `Unknown tool: ${toolName}` }
	}
})
