import { Hono } from 'hono'
import type { Env } from '../types.js'
import { generateId } from '../utils/id.js'

export const ratingsRoutes = new Hono<{ Bindings: Env }>()

ratingsRoutes.post('/api/skills/:id/rate', async (c) => {
	const id = c.req.param('id')
	const body = await c.req.json<{ userId?: string; stars?: number; comment?: string }>()

	if (!body.userId || typeof body.stars !== 'number' || body.stars < 1 || body.stars > 5) {
		return c.json({ error: 'userId (string) and stars (1-5) are required' }, 400)
	}

	const db = c.env.DB

	const skill = await db.prepare('SELECT id FROM registry_skills WHERE id = ?').bind(id).first()
	if (!skill) return c.json({ error: 'Skill not found' }, 404)

	await db.prepare(
		`INSERT OR REPLACE INTO skill_ratings (id, skill_id, user_id, stars, comment, created_at)
		 VALUES (?, ?, ?, ?, ?, ?)`
	).bind(generateId(), id, body.userId, body.stars, body.comment || '', Date.now()).run()

	const stats = await db.prepare(
		'SELECT avg(stars) as avg_stars, count(*) as cnt FROM skill_ratings WHERE skill_id = ?'
	).bind(id).first<{ avg_stars: number; cnt: number }>()

	const avgRating = Math.round((stats?.avg_stars ?? 0) * 10) / 10
	const ratingCount = stats?.cnt ?? 0

	await db.prepare(
		'UPDATE registry_skills SET rating = ?, rating_count = ? WHERE id = ?'
	).bind(avgRating, ratingCount, id).run()

	return c.json({ success: true, rating: avgRating, ratingCount })
})

ratingsRoutes.get('/api/skills/:id/ratings', async (c) => {
	const id = c.req.param('id')
	const db = c.env.DB

	const { results: ratings } = await db.prepare(
		'SELECT * FROM skill_ratings WHERE skill_id = ? ORDER BY created_at DESC LIMIT 50'
	).bind(id).all()

	return c.json({ ratings: ratings || [] })
})
