import { mkdir, readdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, normalize, resolve } from 'node:path'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

const SENSITIVE_PATHS = [
	'/etc/shadow',
	'/etc/passwd',
	'/etc/sudoers',
	'.ssh/',
	'.gnupg/',
	'.env',
	'.env.local',
	'.env.production',
]

function getAllowedRoots(ctx: { manifest: SkillManifest }): string[] {
	const fsCap = ctx.manifest.capabilities?.filesystem
	if (!fsCap?.paths?.length) return []
	if (fsCap.paths.includes('*')) {
		return [homedir(), process.cwd()]
	}
	return fsCap.paths.map((p: string) => (isAbsolute(p) ? normalize(p) : resolve(process.cwd(), p)))
}

function isPathAllowed(targetPath: string, allowedRoots: string[]): boolean {
	const normalized = normalize(targetPath)
	for (const sensitive of SENSITIVE_PATHS) {
		if (normalized.includes(sensitive)) return false
	}
	if (allowedRoots.length === 0) return false
	return allowedRoots.some((root) => normalized.startsWith(root))
}

async function assertPathAllowed(rawPath: string, allowedRoots: string[]): Promise<string> {
	const resolved = isAbsolute(rawPath) ? normalize(rawPath) : resolve(process.cwd(), rawPath)
	if (!isPathAllowed(resolved, allowedRoots)) {
		throw new Error(`Access denied: path "${rawPath}" is outside allowed directories`)
	}
	try {
		const real = await realpath(resolved)
		if (!isPathAllowed(real, allowedRoots)) {
			throw new Error(
				`Access denied: resolved symlink for "${rawPath}" is outside allowed directories`,
			)
		}
		return real
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
			const parentDir = dirname(resolved)
			if (!isPathAllowed(parentDir, allowedRoots)) {
				throw new Error(`Access denied: path "${rawPath}" is outside allowed directories`)
			}
			return resolved
		}
		throw err
	}
}

interface DirEntry {
	name: string
	type: 'file' | 'directory'
	children?: DirEntry[]
}

async function listRecursive(
	dirPath: string,
	allowedRoots: string[],
	depth = 0,
): Promise<DirEntry[]> {
	if (depth > 10) return []
	const entries = await readdir(dirPath, { withFileTypes: true })
	const result: DirEntry[] = []

	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue
		const fullPath = join(dirPath, entry.name)
		if (!isPathAllowed(fullPath, allowedRoots)) continue
		if (entry.isDirectory()) {
			result.push({
				name: entry.name,
				type: 'directory',
				children: await listRecursive(fullPath, allowedRoots, depth + 1),
			})
		} else {
			result.push({ name: entry.name, type: 'file' })
		}
	}

	return result
}

const MAX_READ_SIZE = 10 * 1024 * 1024
const MAX_WRITE_SIZE = 5 * 1024 * 1024

export const filesystem = defineSkill(manifest, async (toolName, args, ctx) => {
	const allowedRoots = getAllowedRoots(ctx)
	if (allowedRoots.length === 0) {
		return { success: false, error: 'Filesystem access is not enabled for this skill' }
	}

	switch (toolName) {
		case 'read_file': {
			const rawPath = args.path as string
			try {
				const safePath = await assertPathAllowed(rawPath, allowedRoots)
				ctx.log(`Reading file: ${safePath}`)
				const content = await readFile(safePath, 'utf-8')
				if (content.length > MAX_READ_SIZE) {
					return {
						success: false,
						error: `File exceeds maximum read size of ${MAX_READ_SIZE} bytes`,
					}
				}
				return { success: true, data: { content } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'write_file': {
			const rawPath = args.path as string
			const content = args.content as string
			if (Buffer.byteLength(content) > MAX_WRITE_SIZE) {
				return {
					success: false,
					error: `Content exceeds maximum write size of ${MAX_WRITE_SIZE} bytes`,
				}
			}
			try {
				const safePath = await assertPathAllowed(rawPath, allowedRoots)
				ctx.log(`Writing file: ${safePath}`)
				await mkdir(dirname(safePath), { recursive: true })
				await writeFile(safePath, content, 'utf-8')
				return { success: true, data: { bytesWritten: Buffer.byteLength(content) } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'list_directory': {
			const rawPath = args.path as string
			const recursive = (args.recursive as boolean | undefined) ?? false
			try {
				const safePath = await assertPathAllowed(rawPath, allowedRoots)
				ctx.log(`Listing directory: ${safePath}`)
				if (recursive) {
					const entries = await listRecursive(safePath, allowedRoots)
					return { success: true, data: { entries } }
				}
				const dirEntries = await readdir(safePath, { withFileTypes: true })
				const entries: DirEntry[] = dirEntries
					.filter((e) => !e.name.startsWith('.'))
					.map((e) => ({
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
