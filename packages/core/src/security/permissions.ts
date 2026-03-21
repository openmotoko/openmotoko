import { and, eq } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'
import { getDb } from '../db/index.js'

export type PermissionType = 'filesystem' | 'network' | 'shell' | 'env' | 'browser' | 'database'

export interface PermissionScope {
	type: PermissionType
	/** For filesystem: glob patterns. For network: domain list. For shell: command list. For env: var names. */
	allow: string[]
	deny?: string[]
}

export interface PermissionGrant {
	id: string
	skillId: string
	permissionType: PermissionType
	scope: string
	grantedAt: number
	expiresAt: number | null
}

export const permissionGrants = sqliteTable('permission_grants', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	skillId: text().notNull(),
	permissionType: text().notNull(),
	scope: text().notNull(),
	grantedAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
	expiresAt: integer(),
})

export type PermissionGrantRow = typeof permissionGrants.$inferSelect
export type NewPermissionGrant = typeof permissionGrants.$inferInsert

export class PermissionManager {
	private db() {
		return getDb()
	}

	async grant(
		skillId: string,
		permission: PermissionScope,
		expiresAt?: number | null,
	): Promise<PermissionGrant> {
		const db = this.db()
		const id = nanoid()
		const grantedAt = Date.now()
		const scope = JSON.stringify({ allow: permission.allow, deny: permission.deny ?? [] })

		await db.insert(permissionGrants).values({
			id,
			skillId,
			permissionType: permission.type,
			scope,
			grantedAt,
			expiresAt: expiresAt ?? null,
		})

		return {
			id,
			skillId,
			permissionType: permission.type,
			scope,
			grantedAt,
			expiresAt: expiresAt ?? null,
		}
	}

	async revoke(skillId: string, permissionType: PermissionType): Promise<void> {
		const db = this.db()
		await db
			.delete(permissionGrants)
			.where(
				and(
					eq(permissionGrants.skillId, skillId),
					eq(permissionGrants.permissionType, permissionType),
				),
			)
	}

	async check(skillId: string, permission: PermissionScope): Promise<boolean> {
		const db = this.db()
		const grants = await db
			.select()
			.from(permissionGrants)
			.where(
				and(
					eq(permissionGrants.skillId, skillId),
					eq(permissionGrants.permissionType, permission.type),
				),
			)

		if (grants.length === 0) return false

		const now = Date.now()
		for (const grant of grants) {
			if (grant.expiresAt && grant.expiresAt < now) continue

			const scope = JSON.parse(grant.scope) as { allow: string[]; deny: string[] }

			// Check if any requested resource is in the deny list
			for (const resource of permission.allow) {
				if (scope.deny?.some((pattern) => matchesPattern(resource, pattern))) {
					return false
				}
			}

			// Check if all requested resources are in the allow list
			const allAllowed = permission.allow.every((resource) =>
				scope.allow.some((pattern) => matchesPattern(resource, pattern)),
			)

			if (allAllowed) return true
		}

		return false
	}

	async getGrants(skillId: string): Promise<PermissionGrant[]> {
		const db = this.db()
		const rows = await db
			.select()
			.from(permissionGrants)
			.where(eq(permissionGrants.skillId, skillId))

		return rows.map((row) => ({
			id: row.id,
			skillId: row.skillId,
			permissionType: row.permissionType as PermissionType,
			scope: row.scope,
			grantedAt: row.grantedAt,
			expiresAt: row.expiresAt,
		}))
	}

	async checkAndLog(skillId: string, permission: PermissionScope): Promise<boolean> {
		const allowed = await this.check(skillId, permission)

		// Log the permission check to the activity/audit system
		const db = this.db()
		await db
			.insert(permissionGrants)
			.values({
				id: nanoid(),
				skillId,
				permissionType: `_audit:${permission.type}`,
				scope: JSON.stringify({
					action: 'check',
					allowed,
					resources: permission.allow,
					timestamp: Date.now(),
				}),
				grantedAt: Date.now(),
				expiresAt: Date.now(), // Audit entries expire immediately
			})
			.catch(() => {
				// Best-effort logging; do not block permission check on log failure
			})

		return allowed
	}
}

/**
 * Simple glob-style pattern matching.
 * Supports * as wildcard within a segment and ** as recursive wildcard.
 */
function matchesPattern(value: string, pattern: string): boolean {
	if (pattern === '*' || pattern === '**') return true
	if (pattern === value) return true

	// Convert glob to regex
	const regexStr = pattern
		.replace(/[.+^${}()|[\]\\]/g, '\\$&')
		.replace(/\*\*/g, '{{GLOBSTAR}}')
		.replace(/\*/g, '[^/]*')
		.replace(/\{\{GLOBSTAR\}\}/g, '.*')

	return new RegExp(`^${regexStr}$`).test(value)
}

export const permissionManager = new PermissionManager()
