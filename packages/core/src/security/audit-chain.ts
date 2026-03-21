import { createHash } from 'node:crypto'
import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'
import { getDb } from '../db/index.js'

export type AuditEventType =
	| 'permission.grant'
	| 'permission.deny'
	| 'injection.detected'
	| 'injection.blocked'
	| 'skill.install'
	| 'skill.uninstall'
	| 'auth.login'
	| 'auth.failed'
	| 'config.changed'
	| 'tool.executed'
	| 'vault.accessed'
	| 'firewall.blocked'

export interface AuditEvent {
	type: AuditEventType
	skillId?: string
	data: Record<string, unknown>
}

export interface AuditEntry extends AuditEvent {
	id: string
	prevHash: string | null
	hash: string
	timestamp: number
}

export interface AuditFilter {
	type?: AuditEventType
	skillId?: string
	from?: number
	to?: number
	limit?: number
	offset?: number
}

export interface AuditStats {
	totalEvents: number
	countsByType: Record<string, number>
	recentEvents: AuditEntry[]
	oldestTimestamp: number | null
	newestTimestamp: number | null
}

export const auditChain = sqliteTable('audit_chain', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	prevHash: text(),
	eventType: text().notNull(),
	skillId: text(),
	data: text().notNull(),
	hash: text().notNull(),
	timestamp: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export type AuditChainRow = typeof auditChain.$inferSelect

function computeHash(entry: {
	prevHash: string | null
	eventType: string
	skillId?: string
	data: string
	timestamp: number
}): string {
	const payload = JSON.stringify({
		prevHash: entry.prevHash,
		eventType: entry.eventType,
		skillId: entry.skillId ?? null,
		data: entry.data,
		timestamp: entry.timestamp,
	})
	return createHash('sha256').update(payload).digest('hex')
}

export class AuditChain {
	private db() {
		return getDb()
	}

	async append(event: AuditEvent): Promise<AuditEntry> {
		const db = this.db()
		const id = nanoid()
		const timestamp = Date.now()
		const dataStr = JSON.stringify(event.data)

		// Get the last entry's hash to chain
		const lastEntries = await db
			.select({ hash: auditChain.hash })
			.from(auditChain)
			.orderBy(desc(auditChain.timestamp))
			.limit(1)

		const prevHash = lastEntries.length > 0 ? lastEntries[0].hash : null

		const hash = computeHash({
			prevHash,
			eventType: event.type,
			skillId: event.skillId,
			data: dataStr,
			timestamp,
		})

		await db.insert(auditChain).values({
			id,
			prevHash,
			eventType: event.type,
			skillId: event.skillId ?? null,
			data: dataStr,
			hash,
			timestamp,
		})

		return {
			id,
			type: event.type,
			skillId: event.skillId,
			data: event.data,
			prevHash,
			hash,
			timestamp,
		}
	}

	async verify(): Promise<{ valid: boolean; brokenAt?: number }> {
		const db = this.db()
		const entries = await db.select().from(auditChain).orderBy(auditChain.timestamp)

		if (entries.length === 0) return { valid: true }

		for (let i = 0; i < entries.length; i++) {
			const entry = entries[i]

			// Verify hash chain linkage
			if (i === 0) {
				if (entry.prevHash !== null) {
					return { valid: false, brokenAt: i }
				}
			} else {
				if (entry.prevHash !== entries[i - 1].hash) {
					return { valid: false, brokenAt: i }
				}
			}

			// Verify hash integrity
			const expectedHash = computeHash({
				prevHash: entry.prevHash,
				eventType: entry.eventType,
				skillId: entry.skillId ?? undefined,
				data: entry.data,
				timestamp: entry.timestamp,
			})

			if (entry.hash !== expectedHash) {
				return { valid: false, brokenAt: i }
			}
		}

		return { valid: true }
	}

	async query(filters: AuditFilter): Promise<AuditEntry[]> {
		const db = this.db()
		const conditions = []

		if (filters.type) {
			conditions.push(eq(auditChain.eventType, filters.type))
		}
		if (filters.skillId) {
			conditions.push(eq(auditChain.skillId, filters.skillId))
		}
		if (filters.from) {
			conditions.push(gte(auditChain.timestamp, filters.from))
		}
		if (filters.to) {
			conditions.push(lte(auditChain.timestamp, filters.to))
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined

		let query = db.select().from(auditChain).orderBy(desc(auditChain.timestamp))

		if (whereClause) {
			query = query.where(whereClause) as typeof query
		}

		if (filters.limit) {
			query = query.limit(filters.limit) as typeof query
		}

		if (filters.offset) {
			query = query.offset(filters.offset) as typeof query
		}

		const rows = await query
		return rows.map(rowToEntry)
	}

	async export(): Promise<AuditEntry[]> {
		const db = this.db()
		const rows = await db.select().from(auditChain).orderBy(auditChain.timestamp)

		return rows.map(rowToEntry)
	}

	async getStats(): Promise<AuditStats> {
		const db = this.db()

		const allRows = await db.select().from(auditChain).orderBy(auditChain.timestamp)

		const countsByType: Record<string, number> = {}
		let oldestTimestamp: number | null = null
		let newestTimestamp: number | null = null

		for (const row of allRows) {
			countsByType[row.eventType] = (countsByType[row.eventType] ?? 0) + 1

			if (oldestTimestamp === null || row.timestamp < oldestTimestamp) {
				oldestTimestamp = row.timestamp
			}
			if (newestTimestamp === null || row.timestamp > newestTimestamp) {
				newestTimestamp = row.timestamp
			}
		}

		// Get 10 most recent events
		const recentRows = await db
			.select()
			.from(auditChain)
			.orderBy(desc(auditChain.timestamp))
			.limit(10)

		return {
			totalEvents: allRows.length,
			countsByType,
			recentEvents: recentRows.map(rowToEntry),
			oldestTimestamp,
			newestTimestamp,
		}
	}
}

function rowToEntry(row: AuditChainRow): AuditEntry {
	return {
		id: row.id,
		type: row.eventType as AuditEventType,
		skillId: row.skillId ?? undefined,
		data: JSON.parse(row.data) as Record<string, unknown>,
		prevHash: row.prevHash,
		hash: row.hash,
		timestamp: row.timestamp,
	}
}

export const auditChainInstance = new AuditChain()
