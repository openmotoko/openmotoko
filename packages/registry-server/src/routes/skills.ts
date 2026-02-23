import { Hono } from 'hono'
import type { Env } from '../types.js'

export const skillsRoutes = new Hono<{ Bindings: Env }>()

skillsRoutes.get('/api/skills', async (c) => {
	const db = c.env.DB
	const q = c.req.query('q')
	const tags = c.req.query('tags')
	const verified = c.req.query('verified')
	const sort = c.req.query('sort') || 'recent'
	const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50'), 1), 100)
	const offset = Math.max(parseInt(c.req.query('offset') || '0'), 0)

	let sql = 'SELECT * FROM registry_skills'
	const conditions: string[] = []
	const params: unknown[] = []

	if (q) {
		conditions.push('(name LIKE ? OR description LIKE ?)')
		params.push(`%${q}%`, `%${q}%`)
	}
	if (verified === 'true') {
		conditions.push('verified = 1')
	} else if (verified === 'false') {
		conditions.push('verified = 0')
	}

	if (conditions.length > 0) {
		sql += ' WHERE ' + conditions.join(' AND ')
	}

	switch (sort) {
		case 'downloads': sql += ' ORDER BY downloads DESC'; break
		case 'rating': sql += ' ORDER BY rating DESC'; break
		default: sql += ' ORDER BY published_at DESC'
	}

	sql += ' LIMIT ? OFFSET ?'
	params.push(limit, offset)

	const { results } = await db.prepare(sql).bind(...params).all()

	let skills = (results || []).map((r: Record<string, unknown>) => ({
		...r,
		tags: JSON.parse(r.tags as string),
		verified: r.verified === 1,
	}))

	if (tags) {
		const tagList = tags.split(',').map((t: string) => t.trim())
		skills = skills.filter((s) => tagList.some((t: string) => (s.tags as string[]).includes(t)))
	}

	let countSql = 'SELECT count(*) as cnt FROM registry_skills'
	const countParams: unknown[] = []
	if (q) {
		countSql += ' WHERE (name LIKE ? OR description LIKE ?)'
		countParams.push(`%${q}%`, `%${q}%`)
	}
	const countResult = await db.prepare(countSql).bind(...countParams).first<{ cnt: number }>()
	const total = countResult?.cnt ?? 0

	return c.json({ skills, total })
})

skillsRoutes.get('/api/skills/:id', async (c) => {
	const id = c.req.param('id')
	const db = c.env.DB

	const skill = await db.prepare('SELECT * FROM registry_skills WHERE id = ?').bind(id).first()
	if (!skill) return c.json({ error: 'Skill not found' }, 404)

	const { results: ratings } = await db.prepare(
		'SELECT * FROM skill_ratings WHERE skill_id = ? ORDER BY created_at DESC LIMIT 20'
	).bind(id).all()

	const latestScan = await db.prepare(
		'SELECT * FROM security_scans WHERE skill_id = ? ORDER BY scanned_at DESC LIMIT 1'
	).bind(id).first()

	return c.json({
		...skill,
		tags: JSON.parse(skill.tags as string),
		verified: skill.verified === 1,
		ratings: ratings || [],
		securityScan: latestScan ? {
			...latestScan,
			passed: latestScan.passed === 1,
			findings: JSON.parse(latestScan.findings as string),
		} : null,
	})
})

skillsRoutes.get('/api/skills/:id/scan', async (c) => {
	const id = c.req.param('id')
	const db = c.env.DB

	const skill = await db.prepare('SELECT id FROM registry_skills WHERE id = ?').bind(id).first()
	if (!skill) return c.json({ error: 'Skill not found', code: 'NOT_FOUND' }, 404)

	const { results: scans } = await db.prepare(
		'SELECT * FROM security_scans WHERE skill_id = ? ORDER BY scanned_at DESC LIMIT 10'
	).bind(id).all()

	if (!scans || scans.length === 0) {
		return c.json({ error: 'No scan results found', code: 'NO_SCANS' }, 404)
	}

	const latest = scans[0]
	return c.json({
		skillId: id,
		latest: {
			...latest,
			passed: latest.passed === 1,
			findings: JSON.parse(latest.findings as string),
		},
		history: scans.map((s: Record<string, unknown>) => ({
			id: s.id,
			version: s.version,
			passed: s.passed === 1,
			grade: s.grade,
			score: s.score,
			findingCount: JSON.parse(s.findings as string).length,
			scannedAt: s.scanned_at,
		})),
	})
})
