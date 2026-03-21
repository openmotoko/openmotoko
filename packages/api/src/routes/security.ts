import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'

// ---------------------------------------------------------------------------
// In-memory stores (will be replaced by DB tables in a future migration)
// ---------------------------------------------------------------------------

interface AuditEntry {
	id: string
	type: string
	skillId: string | null
	details: string
	hash: string
	parentHash: string | null
	createdAt: number
}

interface ThreatInfo {
	id: string
	type: 'injection' | 'permission_violation' | 'rate_limit' | 'firewall'
	source: string
	details: string
	severity: 'low' | 'medium' | 'high' | 'critical'
	blocked: boolean
	createdAt: number
}

interface VaultSecret {
	key: string
	/** Never exposed via API — stored as encrypted bytes in production */
	secret: string
	createdAt: number
	rotatedAt: number | null
}

interface PermissionGrant {
	skillId: string
	skillName: string
	permissions: string[]
	grantedAt: number
	revokedAt: number | null
}

const auditLog: AuditEntry[] = []
const threats: ThreatInfo[] = []
const vault: Map<string, VaultSecret> = new Map()
const permissionGrants: Map<string, PermissionGrant> = new Map()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let auditSeq = 0

function generateId(prefix: string): string {
	return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

async function sha256(data: string): Promise<string> {
	const { createHash } = await import('node:crypto')
	return createHash('sha256').update(data).digest('hex')
}

async function appendAudit(
	type: string,
	details: string,
	skillId: string | null = null,
): Promise<AuditEntry> {
	const parentHash = auditLog.length > 0 ? auditLog[auditLog.length - 1].hash : null
	const payload = `${auditSeq++}:${type}:${details}:${parentHash ?? 'genesis'}`
	const hash = await sha256(payload)

	const entry: AuditEntry = {
		id: generateId('aud'),
		type,
		skillId,
		details,
		hash,
		parentHash,
		createdAt: Date.now(),
	}
	auditLog.push(entry)
	return entry
}

function computeSecurityScore(): number {
	let score = 100

	// Deduct points for various security gaps
	const hasPassword = Boolean(process.env.OPENMOTOKO_PASSWORD)
	const hasSessionSecret = Boolean(process.env.OPENMOTOKO_SESSION_SECRET)
	const hasVaultSecrets = vault.size > 0
	const hasPermissions = permissionGrants.size > 0

	if (!hasPassword) score -= 25
	if (!hasSessionSecret) score -= 20
	if (!hasVaultSecrets) score -= 10
	if (!hasPermissions) score -= 5

	// Deduct for recent unblocked threats
	const oneDayAgo = Date.now() - 86_400_000
	const recentUnblocked = threats.filter((t) => t.createdAt > oneDayAgo && !t.blocked)
	score -= Math.min(recentUnblocked.length * 5, 30)

	// Deduct if no audit entries (monitoring not active)
	if (auditLog.length === 0) score -= 10

	return Math.max(0, Math.min(100, score))
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const auditQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(200).default(50),
	offset: z.coerce.number().int().min(0).default(0),
	type: z.string().optional(),
	skillId: z.string().optional(),
	from: z.coerce.number().optional(),
	to: z.coerce.number().optional(),
})

const vaultStoreSchema = z.object({
	key: z
		.string()
		.min(1)
		.max(128)
		.regex(/^[a-zA-Z_][a-zA-Z0-9_.-]*$/, 'Invalid key format'),
	secret: z.string().min(1).max(8192),
})

const vaultKeyParamsSchema = z.object({
	key: z.string().min(1),
})

const skillIdParamsSchema = z.object({
	skillId: z.string().min(1),
})

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export default async function securityRoutes(fastify: FastifyInstance) {
	// -----------------------------------------------------------------------
	// GET /api/security/dashboard — aggregated security metrics
	// -----------------------------------------------------------------------
	fastify.get('/api/security/dashboard', async (_request, reply) => {
		const oneDayAgo = Date.now() - 86_400_000

		const recentThreats = threats.filter((t) => t.createdAt > oneDayAgo)
		const injectionBlocked24h = recentThreats.filter(
			(t) => t.type === 'injection' && t.blocked,
		).length
		const permissionViolations24h = recentThreats.filter(
			(t) => t.type === 'permission_violation',
		).length
		const auditEvents24h = auditLog.filter((e) => e.createdAt > oneDayAgo).length
		const securityScore = computeSecurityScore()
		const activeSessions = 1 // placeholder — will integrate with session store

		return reply.send({
			injectionBlocked24h,
			permissionViolations24h,
			auditEvents24h,
			securityScore,
			activeSessions,
			firewallBlocks24h: recentThreats.filter((t) => t.type === 'firewall').length,
			totalThreats24h: recentThreats.length,
		})
	})

	// -----------------------------------------------------------------------
	// GET /api/security/audit — paginated audit chain
	// -----------------------------------------------------------------------
	fastify.get(
		'/api/security/audit',
		{ preHandler: validate({ query: auditQuerySchema }) },
		async (request, reply) => {
			const { limit, offset, type, skillId, from, to } = request.query as z.infer<
				typeof auditQuerySchema
			>

			let filtered = [...auditLog].reverse() // newest first

			if (type) filtered = filtered.filter((e) => e.type === type)
			if (skillId) filtered = filtered.filter((e) => e.skillId === skillId)
			if (from) filtered = filtered.filter((e) => e.createdAt >= from)
			if (to) filtered = filtered.filter((e) => e.createdAt <= to)

			const total = filtered.length
			const entries = filtered.slice(offset, offset + limit)

			return reply.send({ entries, total })
		},
	)

	// -----------------------------------------------------------------------
	// GET /api/security/threats — recent threat detections (last 24h)
	// -----------------------------------------------------------------------
	fastify.get('/api/security/threats', async (_request, reply) => {
		const oneDayAgo = Date.now() - 86_400_000
		const recent = threats
			.filter((t) => t.createdAt > oneDayAgo)
			.sort((a, b) => b.createdAt - a.createdAt)

		return reply.send({ threats: recent, total: recent.length })
	})

	// -----------------------------------------------------------------------
	// POST /api/security/vault — store a secret
	// -----------------------------------------------------------------------
	fastify.post(
		'/api/security/vault',
		{ preHandler: validate({ body: vaultStoreSchema }) },
		async (request, reply) => {
			const { key, secret } = request.body as z.infer<typeof vaultStoreSchema>
			const existing = vault.get(key)
			const now = Date.now()

			vault.set(key, {
				key,
				secret,
				createdAt: existing?.createdAt ?? now,
				rotatedAt: existing ? now : null,
			})

			await appendAudit('vault.store', `Secret stored: ${key}`)

			return reply.status(201).send({ success: true, key })
		},
	)

	// -----------------------------------------------------------------------
	// GET /api/security/vault — list secret keys (never values)
	// -----------------------------------------------------------------------
	fastify.get('/api/security/vault', async (_request, reply) => {
		const secrets = Array.from(vault.values()).map(({ key, createdAt, rotatedAt }) => ({
			key,
			createdAt,
			rotatedAt,
		}))

		return reply.send({ secrets })
	})

	// -----------------------------------------------------------------------
	// DELETE /api/security/vault/:key — revoke a secret
	// -----------------------------------------------------------------------
	fastify.delete(
		'/api/security/vault/:key',
		{ preHandler: validate({ params: vaultKeyParamsSchema }) },
		async (request, reply) => {
			const { key } = request.params as { key: string }

			if (!vault.has(key)) {
				return reply.status(404).send({
					error: 'Secret not found',
					code: 'NOT_FOUND',
				})
			}

			vault.delete(key)
			await appendAudit('vault.revoke', `Secret revoked: ${key}`)

			return reply.send({ success: true, key })
		},
	)

	// -----------------------------------------------------------------------
	// GET /api/security/permissions — all permission grants
	// -----------------------------------------------------------------------
	fastify.get('/api/security/permissions', async (_request, reply) => {
		const grants = Array.from(permissionGrants.values()).sort((a, b) => b.grantedAt - a.grantedAt)

		return reply.send({ grants })
	})

	// -----------------------------------------------------------------------
	// POST /api/security/permissions/:skillId/revoke — revoke all for skill
	// -----------------------------------------------------------------------
	fastify.post(
		'/api/security/permissions/:skillId/revoke',
		{ preHandler: validate({ params: skillIdParamsSchema }) },
		async (request, reply) => {
			const { skillId } = request.params as { skillId: string }
			const grant = permissionGrants.get(skillId)

			if (!grant) {
				return reply.status(404).send({
					error: 'No permissions found for skill',
					code: 'NOT_FOUND',
				})
			}

			permissionGrants.set(skillId, {
				...grant,
				revokedAt: Date.now(),
				permissions: [],
			})

			await appendAudit('permission.revoke', `All permissions revoked for ${skillId}`, skillId)

			return reply.send({ success: true, skillId })
		},
	)

	// -----------------------------------------------------------------------
	// GET /api/security/score — compute security score (0-100)
	// -----------------------------------------------------------------------
	fastify.get('/api/security/score', async (_request, reply) => {
		const score = computeSecurityScore()

		const factors: { name: string; impact: number; status: 'pass' | 'fail' | 'warn' }[] = [
			{
				name: 'Admin password configured',
				impact: 25,
				status: process.env.OPENMOTOKO_PASSWORD ? 'pass' : 'fail',
			},
			{
				name: 'Session secret configured',
				impact: 20,
				status: process.env.OPENMOTOKO_SESSION_SECRET ? 'pass' : 'fail',
			},
			{
				name: 'Vault secrets configured',
				impact: 10,
				status: vault.size > 0 ? 'pass' : 'warn',
			},
			{
				name: 'Skill permissions configured',
				impact: 5,
				status: permissionGrants.size > 0 ? 'pass' : 'warn',
			},
			{
				name: 'Audit monitoring active',
				impact: 10,
				status: auditLog.length > 0 ? 'pass' : 'warn',
			},
			{
				name: 'No unblocked threats',
				impact: 30,
				status:
					threats.filter((t) => t.createdAt > Date.now() - 86_400_000 && !t.blocked).length === 0
						? 'pass'
						: 'fail',
			},
		]

		return reply.send({ score, factors })
	})

	// -----------------------------------------------------------------------
	// Seed an initial audit entry on startup
	// -----------------------------------------------------------------------
	await appendAudit('system.startup', 'Security subsystem initialized')
}
