import { describe, expect, it } from 'vitest'
import { homedir } from 'node:os'
import { normalize, resolve, isAbsolute } from 'node:path'

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

function getAllowedRoots(manifestPaths: string[]): string[] {
	if (!manifestPaths.length) return []
	if (manifestPaths.includes('*')) return [homedir(), process.cwd()]
	return manifestPaths.map((p: string) =>
		isAbsolute(p) ? normalize(p) : resolve(process.cwd(), p),
	)
}

function isPathAllowed(targetPath: string, allowedRoots: string[]): boolean {
	const normalized = normalize(targetPath)
	for (const sensitive of SENSITIVE_PATHS) {
		if (normalized.includes(sensitive)) return false
	}
	if (allowedRoots.length === 0) return false
	return allowedRoots.some((root) => normalized.startsWith(root))
}

describe('Filesystem Path Restrictions', () => {
	describe('getAllowedRoots', () => {
		it('returns empty for no paths', () => {
			expect(getAllowedRoots([])).toEqual([])
		})

		it('returns home + cwd for wildcard', () => {
			const roots = getAllowedRoots(['*'])
			expect(roots).toContain(homedir())
			expect(roots).toContain(process.cwd())
		})

		it('resolves relative paths against cwd', () => {
			const roots = getAllowedRoots(['./src'])
			expect(roots[0]).toBe(resolve(process.cwd(), './src'))
		})

		it('normalizes absolute paths', () => {
			const roots = getAllowedRoots(['/tmp/workspace'])
			expect(roots[0]).toBe(normalize('/tmp/workspace'))
		})
	})

	describe('isPathAllowed', () => {
		const roots = [homedir(), process.cwd()]

		it('allows paths within home directory', () => {
			expect(isPathAllowed(`${homedir()}/projects/file.ts`, roots)).toBe(true)
		})

		it('allows paths within cwd', () => {
			expect(isPathAllowed(`${process.cwd()}/src/index.ts`, roots)).toBe(true)
		})

		it('denies paths outside allowed roots', () => {
			expect(isPathAllowed('/var/log/system.log', roots)).toBe(false)
		})

		it('denies empty allowed roots', () => {
			expect(isPathAllowed('/tmp/test', [])).toBe(false)
		})
	})

	describe('sensitive path blocking', () => {
		const roots = ['/']

		it('blocks /etc/shadow', () => {
			expect(isPathAllowed('/etc/shadow', roots)).toBe(false)
		})

		it('blocks /etc/passwd', () => {
			expect(isPathAllowed('/etc/passwd', roots)).toBe(false)
		})

		it('blocks /etc/sudoers', () => {
			expect(isPathAllowed('/etc/sudoers', roots)).toBe(false)
		})

		it('blocks .ssh directory', () => {
			expect(isPathAllowed('/home/user/.ssh/id_rsa', roots)).toBe(false)
		})

		it('blocks .gnupg directory', () => {
			expect(isPathAllowed('/home/user/.gnupg/private-keys', roots)).toBe(false)
		})

		it('blocks .env files', () => {
			expect(isPathAllowed('/app/.env', roots)).toBe(false)
			expect(isPathAllowed('/app/.env.local', roots)).toBe(false)
			expect(isPathAllowed('/app/.env.production', roots)).toBe(false)
		})
	})

	describe('path traversal attacks', () => {
		const roots = ['/home/user/workspace']

		it('blocks ../../etc/passwd traversal', () => {
			const path = normalize('/home/user/workspace/../../etc/passwd')
			expect(isPathAllowed(path, roots)).toBe(false)
		})

		it('blocks absolute path to /etc', () => {
			expect(isPathAllowed('/etc/hosts', roots)).toBe(false)
		})

		it('blocks /root access', () => {
			expect(isPathAllowed('/root/.bashrc', roots)).toBe(false)
		})
	})
})
