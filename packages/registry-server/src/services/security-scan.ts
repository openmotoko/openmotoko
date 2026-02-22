import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

interface ScanResult {
	passed: boolean
	issues: ScanIssue[]
}

interface ScanIssue {
	severity: 'critical' | 'high' | 'medium' | 'low'
	rule: string
	message: string
	file?: string
	line?: number
}

export async function runSecurityScan(
	skillDir: string,
	manifest: Record<string, unknown>,
): Promise<ScanResult> {
	const issues: ScanIssue[] = []
	const capabilities = (manifest.capabilities ?? {}) as Record<string, unknown>

	const tsFiles = collectFiles(skillDir, ['.ts', '.js', '.mjs'])

	for (const filePath of tsFiles) {
		const content = readFileSync(filePath, 'utf-8')
		const relativePath = filePath.replace(skillDir + '/', '')

		if (/\beval\s*\(/.test(content)) {
			issues.push({
				severity: 'critical',
				rule: 'no-eval',
				message: 'eval() usage detected',
				file: relativePath,
			})
		}

		if (/\bnew\s+Function\s*\(/.test(content)) {
			issues.push({
				severity: 'critical',
				rule: 'no-new-function',
				message: 'new Function() usage detected',
				file: relativePath,
			})
		}

		const usesChildProcess =
			/require\s*\(\s*['"]child_process['"]\s*\)/.test(content) ||
			/from\s+['"]node:child_process['"]/.test(content) ||
			/from\s+['"]child_process['"]/.test(content)

		if (usesChildProcess && !capabilities.shell) {
			issues.push({
				severity: 'high',
				rule: 'undeclared-shell',
				message: 'Uses child_process without declaring shell capability',
				file: relativePath,
			})
		}

		const usesFs =
			/require\s*\(\s*['"]fs['"]\s*\)/.test(content) ||
			/from\s+['"]node:fs['"]/.test(content) ||
			/from\s+['"]fs['"]/.test(content) ||
			/from\s+['"]node:fs\/promises['"]/.test(content)

		const fsCapability = capabilities.filesystem as Record<string, unknown> | undefined
		if (usesFs && !fsCapability?.enabled) {
			issues.push({
				severity: 'high',
				rule: 'undeclared-filesystem',
				message: 'Uses fs module without declaring filesystem capability',
				file: relativePath,
			})
		}

		const usesNet =
			/\bfetch\s*\(/.test(content) ||
			/require\s*\(\s*['"]https?['"]\s*\)/.test(content) ||
			/from\s+['"]node:https?['"]/.test(content)

		if (usesNet && !capabilities.network) {
			issues.push({
				severity: 'medium',
				rule: 'undeclared-network',
				message: 'Uses network APIs without declaring network capability',
				file: relativePath,
			})
		}
	}

	const hasCritical = issues.some((i) => i.severity === 'critical')
	return { passed: !hasCritical, issues }
}

function collectFiles(dir: string, extensions: string[]): string[] {
	const results: string[] = []
	try {
		const entries = readdirSync(dir, { withFileTypes: true })
		for (const entry of entries) {
			const fullPath = join(dir, entry.name)
			if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
			if (entry.isDirectory()) {
				results.push(...collectFiles(fullPath, extensions))
			} else if (extensions.some((ext) => entry.name.endsWith(ext))) {
				results.push(fullPath)
			}
		}
	} catch {
		// skip unreadable dirs
	}
	return results
}
