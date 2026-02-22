import { gte, sql, sum } from 'drizzle-orm'
import { getDb } from '../db/client.js'
import { costLog, settings } from '../db/schema.js'
import { eventBus } from '../events/bus.js'

interface BudgetLimits {
	daily: number
	monthly: number
	alertThresholds: number[]
}

interface BudgetCheckResult {
	allowed: boolean
	reason?: string
	percentUsed: number
}

const DEFAULT_LIMITS: BudgetLimits = {
	daily: 10,
	monthly: 100,
	alertThresholds: [50, 80, 95, 100],
}

export class BudgetEnforcer {
	private emittedThresholds = new Set<string>()

	async getLimits(): Promise<BudgetLimits> {
		const db = getDb()
		const [row] = await db.select().from(settings).where(sql`${settings.key} = 'budget'`).limit(1)

		if (!row) return { ...DEFAULT_LIMITS }

		try {
			return { ...DEFAULT_LIMITS, ...JSON.parse(row.value) }
		} catch {
			return { ...DEFAULT_LIMITS }
		}
	}

	async getTodaySpend(): Promise<number> {
		const db = getDb()
		const startOfDay = new Date()
		startOfDay.setHours(0, 0, 0, 0)

		const [result] = await db
			.select({ total: sum(costLog.cost) })
			.from(costLog)
			.where(gte(costLog.createdAt, startOfDay.getTime()))

		return Number(result?.total ?? 0)
	}

	async getMonthSpend(): Promise<number> {
		const db = getDb()
		const startOfMonth = new Date()
		startOfMonth.setDate(1)
		startOfMonth.setHours(0, 0, 0, 0)

		const [result] = await db
			.select({ total: sum(costLog.cost) })
			.from(costLog)
			.where(gte(costLog.createdAt, startOfMonth.getTime()))

		return Number(result?.total ?? 0)
	}

	async checkBudget(cost: number): Promise<BudgetCheckResult> {
		const limits = await this.getLimits()
		const todaySpend = await this.getTodaySpend()
		const monthSpend = await this.getMonthSpend()

		const projectedDaily = todaySpend + cost
		const projectedMonthly = monthSpend + cost

		const dailyPercent = limits.daily > 0 ? (projectedDaily / limits.daily) * 100 : 0
		const monthlyPercent = limits.monthly > 0 ? (projectedMonthly / limits.monthly) * 100 : 0
		const percentUsed = Math.max(dailyPercent, monthlyPercent)

		this.emitThresholdEvents(limits, dailyPercent, 'daily')
		this.emitThresholdEvents(limits, monthlyPercent, 'monthly')

		if (limits.daily > 0 && projectedDaily > limits.daily) {
			return {
				allowed: false,
				reason: `Daily budget of $${limits.daily} exceeded`,
				percentUsed,
			}
		}

		if (limits.monthly > 0 && projectedMonthly > limits.monthly) {
			return {
				allowed: false,
				reason: `Monthly budget of $${limits.monthly} exceeded`,
				percentUsed,
			}
		}

		return { allowed: true, percentUsed }
	}

	resetThresholds() {
		this.emittedThresholds.clear()
	}

	private emitThresholdEvents(limits: BudgetLimits, percent: number, period: string) {
		for (const threshold of limits.alertThresholds) {
			const key = `${period}:${threshold}`
			if (percent >= threshold && !this.emittedThresholds.has(key)) {
				this.emittedThresholds.add(key)
				eventBus.emit('cost:updated', {
					type: 'cost:updated',
					conversationId: '',
					provider: 'budget',
					model: `${period}:${threshold}%`,
					cost: percent,
				})
			}
		}
	}
}

export const budgetEnforcer = new BudgetEnforcer()
