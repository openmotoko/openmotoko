interface CostEntry {
	provider: string
	model: string
	inputTokens: number
	outputTokens: number
	cost: number
	timestamp: number
}

interface CostSummary {
	totalCost: number
	totalInputTokens: number
	totalOutputTokens: number
	entries: number
}

export interface CostTrackerConfig {
	budgetLimitDaily?: number
	budgetLimitMonthly?: number
}

export class CostTracker {
	private entries: CostEntry[] = []
	private budgetLimitDaily: number
	private budgetLimitMonthly: number

	constructor(config: CostTrackerConfig = {}) {
		this.budgetLimitDaily = config.budgetLimitDaily ?? Number.POSITIVE_INFINITY
		this.budgetLimitMonthly = config.budgetLimitMonthly ?? Number.POSITIVE_INFINITY
	}

	addCost(
		provider: string,
		model: string,
		inputTokens: number,
		outputTokens: number,
		cost: number,
	): void {
		this.entries.push({
			provider,
			model,
			inputTokens,
			outputTokens,
			cost,
			timestamp: Date.now(),
		})
	}

	getTodayTotal(): CostSummary {
		const startOfDay = new Date()
		startOfDay.setHours(0, 0, 0, 0)
		return this.summarize(this.entries.filter((e) => e.timestamp >= startOfDay.getTime()))
	}

	getMonthTotal(): CostSummary {
		const startOfMonth = new Date()
		startOfMonth.setDate(1)
		startOfMonth.setHours(0, 0, 0, 0)
		return this.summarize(this.entries.filter((e) => e.timestamp >= startOfMonth.getTime()))
	}

	getHistory(limit?: number): CostEntry[] {
		const sorted = [...this.entries].sort((a, b) => b.timestamp - a.timestamp)
		return limit ? sorted.slice(0, limit) : sorted
	}

	getByProvider(provider: string): CostSummary {
		return this.summarize(this.entries.filter((e) => e.provider === provider))
	}

	getByModel(model: string): CostSummary {
		return this.summarize(this.entries.filter((e) => e.model === model))
	}

	checkBudget(): {
		withinDaily: boolean
		withinMonthly: boolean
		dailyRemaining: number
		monthlyRemaining: number
	} {
		const daily = this.getTodayTotal()
		const monthly = this.getMonthTotal()

		return {
			withinDaily: daily.totalCost < this.budgetLimitDaily,
			withinMonthly: monthly.totalCost < this.budgetLimitMonthly,
			dailyRemaining: Math.max(0, this.budgetLimitDaily - daily.totalCost),
			monthlyRemaining: Math.max(0, this.budgetLimitMonthly - monthly.totalCost),
		}
	}

	isWithinBudget(): boolean {
		const { withinDaily, withinMonthly } = this.checkBudget()
		return withinDaily && withinMonthly
	}

	setBudgetLimits(daily?: number, monthly?: number): void {
		if (daily != null) this.budgetLimitDaily = daily
		if (monthly != null) this.budgetLimitMonthly = monthly
	}

	clear(): void {
		this.entries = []
	}

	private summarize(entries: CostEntry[]): CostSummary {
		let totalCost = 0
		let totalInputTokens = 0
		let totalOutputTokens = 0

		for (const entry of entries) {
			totalCost += entry.cost
			totalInputTokens += entry.inputTokens
			totalOutputTokens += entry.outputTokens
		}

		return {
			totalCost,
			totalInputTokens,
			totalOutputTokens,
			entries: entries.length,
		}
	}
}
