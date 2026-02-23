import { eq } from 'drizzle-orm'
import { getDb } from '../db/client.js'
import { settings } from '../db/schema.js'
import { autonomyRules } from './schema.js'
import type { AutonomyLevel, AutonomyRule } from './types.js'

const AUTONOMY_SETTING_KEY = 'autonomy_level'
const PROMOTION_THRESHOLD = 10

export class AutonomyDial {
	getLevel(): AutonomyLevel {
		const db = getDb()
		const [row] = db.select().from(settings).where(eq(settings.key, AUTONOMY_SETTING_KEY)).all()
		if (!row) return 0
		const level = parseInt(row.value, 10)
		if (level >= 0 && level <= 3) return level as AutonomyLevel
		return 0
	}

	setLevel(level: AutonomyLevel): void {
		const db = getDb()
		const [existing] = db
			.select()
			.from(settings)
			.where(eq(settings.key, AUTONOMY_SETTING_KEY))
			.all()
		if (existing) {
			db.update(settings)
				.set({ value: String(level), updatedAt: Date.now() })
				.where(eq(settings.key, AUTONOMY_SETTING_KEY))
				.run()
		} else {
			db.insert(settings)
				.values({ key: AUTONOMY_SETTING_KEY, value: String(level) })
				.run()
		}
	}

	shouldRequireApproval(action: string, impact: string): boolean {
		const level = this.getLevel()

		if (level === 0) return true
		if (level === 1) return impact !== 'read-only'
		if (level === 3) return impact === 'irreversible'

		const rule = this.findMatchingRule(action)
		if (rule) {
			if (rule.level === 'autonomous') return false
			if (rule.level === 'blocked') return true
		}

		return impact !== 'read-only'
	}

	private findMatchingRule(action: string): AutonomyRule | null {
		const db = getDb()
		const rules = db.select().from(autonomyRules).all()

		for (const row of rules) {
			if (this.matchPattern(row.pattern, action)) {
				return {
					id: row.id,
					pattern: row.pattern,
					level: row.level as AutonomyRule['level'],
					approvalCount: row.approvalCount,
					rejectionCount: row.rejectionCount,
					lastUpdated: row.lastUpdated,
					overriddenByUser: row.overriddenByUser === 1,
				}
			}
		}

		return null
	}

	private matchPattern(pattern: string, action: string): boolean {
		if (pattern === '*') return true
		if (pattern === action) return true
		if (pattern.endsWith('.*')) {
			const prefix = pattern.slice(0, -2)
			return action.startsWith(prefix)
		}
		return false
	}

	async recordApproval(action: string): Promise<void> {
		await this.updateRuleFromFeedback(action, true)
	}

	async recordRejection(action: string): Promise<void> {
		await this.updateRuleFromFeedback(action, false)
	}

	private async updateRuleFromFeedback(action: string, approved: boolean): Promise<void> {
		const db = getDb()
		const rules = db.select().from(autonomyRules).all()
		let matched = false

		for (const row of rules) {
			if (this.matchPattern(row.pattern, action)) {
				matched = true
				if (row.overriddenByUser === 1) continue

				const updates: Record<string, unknown> = { lastUpdated: Date.now() }
				if (approved) {
					updates.approvalCount = row.approvalCount + 1
					if (row.approvalCount + 1 >= PROMOTION_THRESHOLD && row.level === 'propose') {
						updates.level = 'autonomous'
					}
				} else {
					updates.rejectionCount = row.rejectionCount + 1
					if (row.level === 'autonomous') {
						updates.level = 'propose'
					}
				}

				db.update(autonomyRules).set(updates).where(eq(autonomyRules.id, row.id)).run()
				break
			}
		}

		if (!matched) {
			db.insert(autonomyRules)
				.values({
					pattern: action,
					level: 'propose',
					approvalCount: approved ? 1 : 0,
					rejectionCount: approved ? 0 : 1,
				})
				.run()
		}
	}

	getRules(): AutonomyRule[] {
		const db = getDb()
		return db
			.select()
			.from(autonomyRules)
			.all()
			.map((row) => ({
				id: row.id,
				pattern: row.pattern,
				level: row.level as AutonomyRule['level'],
				approvalCount: row.approvalCount,
				rejectionCount: row.rejectionCount,
				lastUpdated: row.lastUpdated,
				overriddenByUser: row.overriddenByUser === 1,
			}))
	}

	setRule(pattern: string, level: 'autonomous' | 'propose' | 'blocked'): void {
		const db = getDb()
		const [existing] = db
			.select()
			.from(autonomyRules)
			.where(eq(autonomyRules.pattern, pattern))
			.all()

		if (existing) {
			db.update(autonomyRules)
				.set({ level, overriddenByUser: 1, lastUpdated: Date.now() })
				.where(eq(autonomyRules.id, existing.id))
				.run()
		} else {
			db.insert(autonomyRules).values({ pattern, level, overriddenByUser: 1 }).run()
		}
	}

	getSuggestedPromotions(): AutonomyRule[] {
		return this.getRules().filter(
			(r) => r.level === 'propose' && r.approvalCount >= PROMOTION_THRESHOLD && !r.overriddenByUser,
		)
	}
}

let instance: AutonomyDial | null = null

export function getAutonomyDial(): AutonomyDial {
	if (!instance) {
		instance = new AutonomyDial()
	}
	return instance
}
