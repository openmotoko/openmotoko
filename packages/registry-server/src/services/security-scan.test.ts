import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runSecurityScan } from './security-scan.js'

function createTempSkill(files: Record<string, string>): string {
	const dir = mkdtempSync(join(tmpdir(), 'scan-test-'))
	for (const [name, content] of Object.entries(files)) {
		const filePath = join(dir, name)
		const fileDir = filePath.substring(0, filePath.lastIndexOf('/'))
		if (fileDir !== dir) mkdirSync(fileDir, { recursive: true })
		writeFileSync(filePath, content)
	}
	return dir
}

describe('runSecurityScan', () => {
	it('passes clean skill', async () => {
		const dir = createTempSkill({
			'index.ts': 'export const handler = async () => ({ success: true })',
		})
		try {
			const result = await runSecurityScan(dir, { id: 'clean', capabilities: {} })
			expect(result.passed).toBe(true)
			expect(result.issues).toHaveLength(0)
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	it('detects eval() usage', async () => {
		const dir = createTempSkill({
			'index.ts': 'const x = eval("1+1")',
		})
		try {
			const result = await runSecurityScan(dir, { id: 'eval', capabilities: {} })
			expect(result.passed).toBe(false)
			expect(result.issues.some((i) => i.rule === 'no-eval')).toBe(true)
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	it('detects new Function() usage', async () => {
		const dir = createTempSkill({
			'index.ts': 'const fn = new Function("return 42")',
		})
		try {
			const result = await runSecurityScan(dir, { id: 'func', capabilities: {} })
			expect(result.passed).toBe(false)
			expect(result.issues.some((i) => i.rule === 'no-new-function')).toBe(true)
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	it('detects undeclared shell capability', async () => {
		const dir = createTempSkill({
			'index.ts': "import { exec } from 'node:child_process'\nexec('ls')",
		})
		try {
			const result = await runSecurityScan(dir, { id: 'shell', capabilities: {} })
			expect(result.issues.some((i) => i.rule === 'undeclared-shell')).toBe(true)
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	it('allows declared shell capability', async () => {
		const dir = createTempSkill({
			'index.ts': "import { exec } from 'node:child_process'\nexec('ls')",
		})
		try {
			const result = await runSecurityScan(dir, { id: 'ok', capabilities: { shell: true } })
			expect(result.issues.filter((i) => i.rule === 'undeclared-shell')).toHaveLength(0)
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	it('detects undeclared filesystem capability', async () => {
		const dir = createTempSkill({
			'index.ts': "import { readFileSync } from 'node:fs'\nreadFileSync('/tmp/x')",
		})
		try {
			const result = await runSecurityScan(dir, { id: 'fs', capabilities: {} })
			expect(result.issues.some((i) => i.rule === 'undeclared-filesystem')).toBe(true)
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	it('allows declared filesystem capability', async () => {
		const dir = createTempSkill({
			'index.ts': "import { readFileSync } from 'node:fs'\nreadFileSync('/tmp/x')",
		})
		try {
			const result = await runSecurityScan(dir, {
				id: 'ok',
				capabilities: { filesystem: { enabled: true } },
			})
			expect(result.issues.filter((i) => i.rule === 'undeclared-filesystem')).toHaveLength(0)
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	it('detects undeclared network capability', async () => {
		const dir = createTempSkill({
			'index.ts': "const res = fetch('https://example.com')",
		})
		try {
			const result = await runSecurityScan(dir, { id: 'net', capabilities: {} })
			expect(result.issues.some((i) => i.rule === 'undeclared-network')).toBe(true)
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	it('skips node_modules and hidden dirs', async () => {
		const dir = createTempSkill({
			'node_modules/evil/index.ts': 'eval("attack")',
			'.hidden/secret.ts': 'eval("attack")',
			'index.ts': 'export default {}',
		})
		try {
			const result = await runSecurityScan(dir, { id: 'clean', capabilities: {} })
			expect(result.passed).toBe(true)
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})
})
