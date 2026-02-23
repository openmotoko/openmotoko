import type { PulseBudgetState } from './types.js'

export class PulseBudget {
	private dailyLimit: number
	private usedToday = 0
	private dayStart: number

	constructor(dailyLimit: number) {
		this.dailyLimit = dailyLimit
		this.dayStart = this.getDayStart()
	}

	private getDayStart(): number {
		const now = new Date()
		return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
	}

	private maybeResetDay(): void {
		const currentDayStart = this.getDayStart()
		if (currentDayStart > this.dayStart) {
			this.usedToday = 0
			this.dayStart = currentDayStart
		}
	}

	canSpend(tokens: number): boolean {
		this.maybeResetDay()
		return this.usedToday + tokens <= this.dailyLimit
	}

	spend(tokens: number): void {
		this.maybeResetDay()
		this.usedToday += tokens
	}

	getState(): PulseBudgetState {
		this.maybeResetDay()
		return {
			dailyLimit: this.dailyLimit,
			usedToday: this.usedToday,
			remaining: Math.max(0, this.dailyLimit - this.usedToday),
			resetAt: this.dayStart + 86_400_000,
		}
	}

	setDailyLimit(limit: number): void {
		this.dailyLimit = limit
	}
}
