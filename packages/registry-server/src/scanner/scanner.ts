import { VULN_PATTERNS } from './patterns.js'
import type { VulnPattern } from './patterns.js'

export type SecurityGrade = 'A' | 'B' | 'C' | 'D' | 'F'

export interface ScanFinding {
	patternId: string
	severity: VulnPattern['severity']
	category: string
	description: string
	file: string
	line: number
	snippet: string
}

export interface ScanResult {
	grade: SecurityGrade
	score: number
	findings: ScanFinding[]
	scannedFiles: number
	totalLines: number
	scanDuration: number
}

const SCANNABLE_EXTENSIONS = new Set(['.js', '.ts', '.mjs', '.cjs', '.jsx', '.tsx'])

function getExtension(path: string): string {
	const dot = path.lastIndexOf('.')
	return dot >= 0 ? path.slice(dot) : ''
}

function calculateGrade(findings: ScanFinding[]): { grade: SecurityGrade; score: number } {
	let penalty = 0
	for (const f of findings) {
		switch (f.severity) {
			case 'critical': penalty += 25; break
			case 'high': penalty += 15; break
			case 'medium': penalty += 5; break
			case 'low': penalty += 1; break
		}
	}
	const score = Math.max(0, 100 - penalty)
	if (score >= 90) return { grade: 'A', score }
	if (score >= 75) return { grade: 'B', score }
	if (score >= 60) return { grade: 'C', score }
	if (score >= 40) return { grade: 'D', score }
	return { grade: 'F', score }
}

export function scanFiles(files: Map<string, string>): ScanResult {
	const start = Date.now()
	const findings: ScanFinding[] = []
	let totalLines = 0
	let scannedFiles = 0

	for (const [filePath, content] of files) {
		if (filePath.includes('node_modules/') || filePath.startsWith('.')) continue
		if (!SCANNABLE_EXTENSIONS.has(getExtension(filePath))) continue

		scannedFiles++
		const lines = content.split('\n')
		totalLines += lines.length

		for (const pattern of VULN_PATTERNS) {
			for (let i = 0; i < lines.length; i++) {
				if (pattern.pattern.test(lines[i])) {
					findings.push({
						patternId: pattern.id,
						severity: pattern.severity,
						category: pattern.category,
						description: pattern.description,
						file: filePath,
						line: i + 1,
						snippet: lines[i].trim().slice(0, 200),
					})
				}
			}
		}
	}

	const { grade, score } = calculateGrade(findings)
	return { grade, score, findings, scannedFiles, totalLines, scanDuration: Date.now() - start }
}
