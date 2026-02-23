import { and, desc, eq, like, or, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getRegistryDb } from '../db/client.js'
import { registrySkills, securityScans, skillRatings } from '../db/schema.js'

const searchQuery = z.object({
	q: z.string().optional(),
	tags: z.string().optional(),
	verified: z.enum(['true', 'false']).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
	offset: z.coerce.number().int().min(0).optional(),
	sort: z.enum(['downloads', 'rating', 'recent']).optional(),
})

export default async function skillsRoutes(fastify: FastifyInstance) {
	fastify.get('/api/skills', async (request, reply) => {
		const raw = searchQuery.safeParse(request.query)
		if (!raw.success) return reply.status(400).send({ error: raw.error.message })
		const params = raw.data

		const db = getRegistryDb()
		const conditions = []

		if (params.q) {
			const pattern = `%${params.q}%`
			conditions.push(or(like(registrySkills.name, pattern), like(registrySkills.description, pattern)))
		}
		if (params.verified === 'true') {
			conditions.push(eq(registrySkills.verified, 1))
		} else if (params.verified === 'false') {
			conditions.push(eq(registrySkills.verified, 0))
		}

		const where = conditions.length > 0 ? and(...conditions) : undefined

		let orderBy
		switch (params.sort) {
			case 'downloads':
				orderBy = desc(registrySkills.downloads)
				break
			case 'rating':
				orderBy = desc(registrySkills.rating)
				break
			default:
				orderBy = desc(registrySkills.publishedAt)
		}

		const limit = params.limit ?? 50
		const offset = params.offset ?? 0

		const rows = db
			.select()
			.from(registrySkills)
			.where(where)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset)
			.all()

		const filtered = params.tags
			? rows.filter((r) => {
					const rowTags = JSON.parse(r.tags) as string[]
					return params.tags!.split(',').some((t) => rowTags.includes(t.trim()))
				})
			: rows

		let total: number
		if (params.tags) {
			const allRows = db.select().from(registrySkills).where(where).all()
			total = allRows.filter((r) => {
				const rowTags = JSON.parse(r.tags) as string[]
				return params.tags!.split(',').some((t) => rowTags.includes(t.trim()))
			}).length
		} else {
			const result = db
				.select({ count: sql<number>`count(*)` })
				.from(registrySkills)
				.where(where)
				.all()
			total = result[0]?.count ?? 0
		}

		return reply.send({
			skills: filtered.map((r) => ({ ...r, tags: JSON.parse(r.tags), verified: r.verified === 1 })),
			total,
		})
	})

	fastify.get('/api/skills/:id', async (request, reply) => {
		const { id } = request.params as { id: string }
		const db = getRegistryDb()

		const [skill] = db.select().from(registrySkills).where(eq(registrySkills.id, id)).limit(1).all()
		if (!skill) return reply.status(404).send({ error: 'Skill not found' })

		const ratings = db
			.select()
			.from(skillRatings)
			.where(eq(skillRatings.skillId, id))
			.orderBy(desc(skillRatings.createdAt))
			.limit(20)
			.all()

		const [latestScan] = db
			.select()
			.from(securityScans)
			.where(eq(securityScans.skillId, id))
			.orderBy(desc(securityScans.scannedAt))
			.limit(1)
			.all()

		return reply.send({
			...skill,
			tags: JSON.parse(skill.tags),
			verified: skill.verified === 1,
			ratings,
			securityScan: latestScan
				? {
						...latestScan,
						passed: latestScan.passed === 1,
						grade: latestScan.grade,
						score: latestScan.score,
						findings: JSON.parse(latestScan.findings),
						scannedFiles: latestScan.scannedFiles,
						totalLines: latestScan.totalLines,
						scanDuration: latestScan.scanDuration,
					}
				: null,
		})
	})

	fastify.get('/api/skills/:id/scan', async (request, reply) => {
		const { id } = request.params as { id: string }
		const db = getRegistryDb()

		const [skill] = db.select().from(registrySkills).where(eq(registrySkills.id, id)).limit(1).all()
		if (!skill) return reply.status(404).send({ error: 'Skill not found', code: 'NOT_FOUND' })

		const scans = db
			.select()
			.from(securityScans)
			.where(eq(securityScans.skillId, id))
			.orderBy(desc(securityScans.scannedAt))
			.limit(10)
			.all()

		if (scans.length === 0) {
			return reply.status(404).send({ error: 'No scan results found', code: 'NO_SCANS' })
		}

		const latest = scans[0]
		return reply.send({
			skillId: id,
			latest: {
				id: latest.id,
				version: latest.version,
				passed: latest.passed === 1,
				grade: latest.grade,
				score: latest.score,
				findings: JSON.parse(latest.findings),
				scannedFiles: latest.scannedFiles,
				totalLines: latest.totalLines,
				scanDuration: latest.scanDuration,
				scannedAt: latest.scannedAt,
			},
			history: scans.map((s) => ({
				id: s.id,
				version: s.version,
				passed: s.passed === 1,
				grade: s.grade,
				score: s.score,
				findingCount: JSON.parse(s.findings).length,
				scannedAt: s.scannedAt,
			})),
		})
	})
}
