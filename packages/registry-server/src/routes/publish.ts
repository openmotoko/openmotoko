import { Hono } from 'hono'
import type { Env } from '../types.js'
import { generateId } from '../utils/id.js'
import { parseTarGz } from '../utils/tar.js'
import { scanFiles } from '../scanner/scanner.js'

export const publishRoutes = new Hono<{ Bindings: Env }>()

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
	const hash = await crypto.subtle.digest('SHA-256', buffer)
	return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

publishRoutes.post('/api/skills/publish', async (c) => {
	const apiKey = c.req.header('x-api-key')
	const expectedKey = c.env.REGISTRY_API_KEY
	if (!expectedKey) return c.json({ error: 'Publishing is not configured', code: 'UNAVAILABLE' }, 503)
	if (!apiKey || apiKey !== expectedKey) return c.json({ error: 'Invalid or missing API key', code: 'UNAUTHORIZED' }, 401)

	const formData = await c.req.formData()
	const file = formData.get('file') as File | null
	if (!file) return c.json({ error: 'No file uploaded' }, 400)

	const buffer = await file.arrayBuffer()
	const checksum = await sha256Hex(buffer)

	let entries
	try {
		entries = await parseTarGz(buffer)
	} catch {
		return c.json({ error: 'Failed to parse tar.gz archive' }, 400)
	}

	const manifestEntry = entries.find((e) => e.path === 'manifest.json' || e.path.endsWith('/manifest.json'))
	if (!manifestEntry) return c.json({ error: 'No manifest.json in package' }, 400)

	let manifest: Record<string, unknown>
	try {
		manifest = JSON.parse(manifestEntry.content)
	} catch {
		return c.json({ error: 'Invalid manifest.json' }, 400)
	}

	if (!manifest.id || !manifest.name || !manifest.version) {
		return c.json({ error: 'Invalid manifest: missing id, name, or version' }, 400)
	}

	const fileMap = new Map<string, string>()
	for (const entry of entries) {
		fileMap.set(entry.path, entry.content)
	}

	const scanResult = scanFiles(fileMap)

	if (scanResult.grade === 'F') {
		return c.json({
			error: 'Security scan failed',
			code: 'SCAN_REJECTED',
			grade: scanResult.grade,
			score: scanResult.score,
			findings: scanResult.findings,
		}, 422)
	}

	const skillId = manifest.id as string
	const version = manifest.version as string
	const r2Key = `${skillId}-${version}.tar.gz`

	await c.env.PACKAGES.put(r2Key, buffer, {
		customMetadata: { checksum, skillId, version },
	})

	const db = c.env.DB
	const existing = await db.prepare('SELECT id FROM registry_skills WHERE id = ?').bind(skillId).first()

	if (existing) {
		await db.prepare(
			`UPDATE registry_skills SET name = ?, version = ?, description = ?, author = ?,
			 checksum_sha256 = ?, download_url = ?, tags = ?, published_at = ? WHERE id = ?`
		).bind(
			manifest.name as string,
			version,
			(manifest.description as string) || '',
			(manifest.author as string) || '',
			checksum,
			r2Key,
			JSON.stringify(manifest.tags || []),
			Date.now(),
			skillId,
		).run()
	} else {
		await db.prepare(
			`INSERT INTO registry_skills (id, name, version, description, author, checksum_sha256, download_url, tags, published_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		).bind(
			skillId,
			manifest.name as string,
			version,
			(manifest.description as string) || '',
			(manifest.author as string) || '',
			checksum,
			r2Key,
			JSON.stringify(manifest.tags || []),
			Date.now(),
		).run()
	}

	const scanId = generateId()
	await db.prepare(
		`INSERT INTO security_scans (id, skill_id, version, passed, grade, score, issues, findings, scanned_files, total_lines, scan_duration, scanned_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).bind(
		scanId,
		skillId,
		version,
		1,
		scanResult.grade,
		scanResult.score,
		JSON.stringify(scanResult.findings),
		JSON.stringify(scanResult.findings),
		scanResult.scannedFiles,
		scanResult.totalLines,
		scanResult.scanDuration,
		Date.now(),
	).run()

	return c.json({
		id: skillId,
		name: manifest.name,
		version,
		checksum,
		securityScan: {
			grade: scanResult.grade,
			score: scanResult.score,
			findings: scanResult.findings,
			scannedFiles: scanResult.scannedFiles,
			totalLines: scanResult.totalLines,
			scanDuration: scanResult.scanDuration,
		},
	}, 201)
})

publishRoutes.delete('/api/skills/:id', async (c) => {
	const apiKey = c.req.header('x-api-key')
	const expectedKey = c.env.REGISTRY_API_KEY
	if (!expectedKey) return c.json({ error: 'Not configured', code: 'UNAVAILABLE' }, 503)
	if (!apiKey || apiKey !== expectedKey) return c.json({ error: 'Invalid API key', code: 'UNAUTHORIZED' }, 401)

	const id = c.req.param('id')
	const db = c.env.DB

	const skill = await db.prepare('SELECT id, download_url FROM registry_skills WHERE id = ?').bind(id).first<{ id: string; download_url: string }>()
	if (!skill) return c.json({ error: 'Skill not found', code: 'NOT_FOUND' }, 404)

	if (skill.download_url) {
		await c.env.PACKAGES.delete(skill.download_url)
	}

	await db.prepare('DELETE FROM security_scans WHERE skill_id = ?').bind(id).run()
	await db.prepare('DELETE FROM skill_ratings WHERE skill_id = ?').bind(id).run()
	await db.prepare('DELETE FROM registry_skills WHERE id = ?').bind(id).run()

	return new Response(null, { status: 204 })
})

publishRoutes.get('/api/skills/:id/download', async (c) => {
	const id = c.req.param('id')
	const db = c.env.DB

	const skill = await db.prepare('SELECT download_url, version FROM registry_skills WHERE id = ?').bind(id).first<{ download_url: string; version: string }>()
	if (!skill) return c.json({ error: 'Skill not found', code: 'NOT_FOUND' }, 404)

	const object = await c.env.PACKAGES.get(skill.download_url)
	if (!object) return c.json({ error: 'Package file not found', code: 'NOT_FOUND' }, 404)

	await db.prepare('UPDATE registry_skills SET downloads = downloads + 1 WHERE id = ?').bind(id).run()

	return new Response(object.body, {
		headers: {
			'Content-Type': 'application/gzip',
			'Content-Disposition': `attachment; filename="${id}-${skill.version}.tar.gz"`,
		},
	})
})
