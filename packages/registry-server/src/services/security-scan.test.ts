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
	it('passes clean skill with grade A', async () => {
		const dir = createTempSkill({
			'index.ts': 'export const handler = async () => ({ success: true })',
		})
		try {
			const result = await runSecurityScan(dir, { id: 'clean', capabilities: {} })
			expect(result.grade).toBe('A')
			expect(result.score).toBe(100)
			expect(result.findings).toHaveLength(0)
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
			expect(result.findings.some((f) => f.patternId === 'eval-exec')).toBe(true)
			expect(result.score).toBeLessThan(100)
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
			expect(result.findings.some((f) => f.patternId === 'new-function')).toBe(true)
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	it('detects child_process import', async () => {
		const dir = createTempSkill({
			'index.ts': "import { exec } from 'child_process'\nexec('ls')",
		})
		try {
			const result = await runSecurityScan(dir, { id: 'shell', capabilities: {} })
			expect(result.findings.some((f) => f.patternId === 'import-child-process')).toBe(true)
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	it('detects fetch() calls', async () => {
		const dir = createTempSkill({
			'index.ts': "const res = fetch('https://example.com')",
		})
		try {
			const result = await runSecurityScan(dir, { id: 'net', capabilities: {} })
			expect(result.findings.some((f) => f.patternId === 'net-fetch')).toBe(true)
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	it('detects hardcoded credentials', async () => {
		const dir = createTempSkill({
			'index.ts': 'const api_key = "abcdefghijklmnopqrstuvwx"',
		})
		try {
			const result = await runSecurityScan(dir, { id: 'cred', capabilities: {} })
			expect(result.findings.some((f) => f.patternId === 'hardcoded-key')).toBe(true)
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	it('detects prototype pollution', async () => {
		const dir = createTempSkill({
			'index.ts': 'const a = obj.__proto__',
		})
		try {
			const result = await runSecurityScan(dir, { id: 'proto', capabilities: {} })
			expect(result.findings.some((f) => f.patternId === 'prototype-pollution')).toBe(true)
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	it('assigns grade F for many critical findings', async () => {
		const dir = createTempSkill({
			'index.ts': [
				'eval("a")',
				'new Function("b")',
				'const secret = "AKIA1234567890ABCDEF"',
				'const x = obj.__proto__',
				'require("vm")',
			].join('\n'),
		})
		try {
			const result = await runSecurityScan(dir, { id: 'bad', capabilities: {} })
			expect(result.grade).toBe('F')
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
			expect(result.grade).toBe('A')
			expect(result.findings).toHaveLength(0)
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	it('includes file and line in findings', async () => {
		const dir = createTempSkill({
			'src/handler.ts': 'const x = 1\nconst y = eval("2")\nconst z = 3',
		})
		try {
			const result = await runSecurityScan(dir, { id: 'loc', capabilities: {} })
			const finding = result.findings.find((f) => f.patternId === 'eval-exec')
			expect(finding).toBeDefined()
			expect(finding!.file).toBe('src/handler.ts')
			expect(finding!.line).toBe(2)
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	it('reports scan metadata', async () => {
		const dir = createTempSkill({
			'a.ts': 'export const a = 1',
			'b.ts': 'export const b = 2',
		})
		try {
			const result = await runSecurityScan(dir, { id: 'meta', capabilities: {} })
			expect(result.scannedFiles).toBe(2)
			expect(result.totalLines).toBeGreaterThan(0)
			expect(result.scanDuration).toBeGreaterThanOrEqual(0)
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})
})
