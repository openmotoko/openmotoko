export type PulsePriority = 'critical' | 'high' | 'medium' | 'low'

export interface PulseTask {
	id: string
	prompt: string
	priority: PulsePriority
	model: string
	trigger: PulseTrigger
	condition?: string
	lastRun: number | null
	lastResult: 'ok' | 'action-taken' | 'error' | 'skipped' | null
	stateChecksum: string | null
	tokenCostHistory: number[]
	enabled: boolean
}

export type PulseTrigger =
	| { type: 'interval'; every: string }
	| { type: 'cron'; schedule: string }
	| { type: 'event'; event: string }

export interface PulseRunResult {
	taskId: string
	result: 'ok' | 'action-taken' | 'error' | 'skipped'
	tokensUsed: number
	output?: string
	error?: string
	duration: number
}

export interface PulseBudgetState {
	dailyLimit: number
	usedToday: number
	remaining: number
	resetAt: number
}
