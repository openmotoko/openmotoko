import { getConfig } from '../config/index.js'
import { eventBus } from '../events/bus.js'
import { PulseBudget } from './budget.js'
import type { PulseRunResult, PulseTask, PulseTrigger } from './types.js'

type PulseExecutor = (task: PulseTask) => Promise<PulseRunResult>

function parseInterval(every: string): number {
	const match = every.match(/^(\d+)(s|m|h|d)$/)
	if (!match) return 60_000
	const [, numStr = '1', unit] = match
	const num = parseInt(numStr, 10)
	switch (unit) {
		case 's':
			return num * 1000
		case 'm':
			return num * 60_000
		case 'h':
			return num * 3_600_000
		case 'd':
			return num * 86_400_000
		default:
			return 60_000
	}
}

function isInActiveHours(start: string, end: string, timezone: string): boolean {
	try {
		const now = new Date()
		const formatter = new Intl.DateTimeFormat('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
			timeZone: timezone,
		})
		const timeStr = formatter.format(now)
		return timeStr >= start && timeStr <= end
	} catch {
		return true
	}
}

export class PulseScheduler {
	private tasks = new Map<string, PulseTask>()
	private timers = new Map<string, ReturnType<typeof setInterval>>()
	private budget: PulseBudget
	private executor: PulseExecutor | null = null
	private running = false

	constructor(dailyBudget = 200_000) {
		this.budget = new PulseBudget(dailyBudget)
	}

	setExecutor(executor: PulseExecutor): void {
		this.executor = executor
	}

	loadFromConfig(): void {
		const config = getConfig()
		if (!config.pulse.enabled) return

		this.budget.setDailyLimit(config.pulse.budget.daily)

		for (const taskDef of config.pulse.tasks) {
			this.tasks.set(taskDef.id, {
				id: taskDef.id,
				prompt: taskDef.prompt,
				priority: taskDef.priority,
				model: taskDef.model,
				trigger: taskDef.trigger as PulseTrigger,
				condition: taskDef.condition,
				lastRun: null,
				lastResult: null,
				stateChecksum: null,
				tokenCostHistory: [],
				enabled: true,
			})
		}
	}

	start(): void {
		if (this.running) return
		this.running = true

		for (const task of this.tasks.values()) {
			if (!task.enabled) continue
			this.scheduleTask(task)
		}
	}

	stop(): void {
		this.running = false
		for (const timer of this.timers.values()) {
			clearInterval(timer)
		}
		this.timers.clear()
	}

	private scheduleTask(task: PulseTask): void {
		if (task.trigger.type === 'interval') {
			const ms = parseInterval(task.trigger.every)
			const timer = setInterval(() => this.tryRunTask(task.id), ms)
			this.timers.set(task.id, timer)
		} else if (task.trigger.type === 'event') {
			eventBus.on(task.trigger.event as never, () => {
				this.tryRunTask(task.id)
			})
		}
	}

	private async tryRunTask(taskId: string): Promise<void> {
		const task = this.tasks.get(taskId)
		if (!task || !task.enabled || !this.executor) return

		const config = getConfig()
		const { start, end, timezone } = config.pulse.activeHours
		if (!isInActiveHours(start, end, timezone)) return

		const avgCost =
			task.tokenCostHistory.length > 0
				? task.tokenCostHistory.reduce((a, b) => a + b, 0) / task.tokenCostHistory.length
				: 1000

		if (!this.budget.canSpend(avgCost)) {
			if (task.priority !== 'critical') return
		}

		try {
			const result = await this.executor(task)

			task.lastRun = Date.now()
			task.lastResult = result.result
			task.tokenCostHistory.push(result.tokensUsed)
			if (task.tokenCostHistory.length > 20) {
				task.tokenCostHistory.shift()
			}

			this.budget.spend(result.tokensUsed)

			eventBus.emit('scheduler:completed', {
				type: 'scheduler:completed',
				taskId: task.id,
				taskName: task.id,
				duration: result.duration,
			})
		} catch (err) {
			task.lastResult = 'error'
			eventBus.emit('scheduler:failed', {
				type: 'scheduler:failed',
				taskId: task.id,
				taskName: task.id,
				error: err instanceof Error ? err.message : String(err),
			})
		}
	}

	addTask(task: PulseTask): void {
		this.tasks.set(task.id, task)
		if (this.running && task.enabled) {
			this.scheduleTask(task)
		}
	}

	removeTask(taskId: string): void {
		this.tasks.delete(taskId)
		const timer = this.timers.get(taskId)
		if (timer) {
			clearInterval(timer)
			this.timers.delete(taskId)
		}
	}

	getTasks(): PulseTask[] {
		return [...this.tasks.values()]
	}

	getTask(taskId: string): PulseTask | undefined {
		return this.tasks.get(taskId)
	}

	getBudgetState() {
		return this.budget.getState()
	}

	isRunning(): boolean {
		return this.running
	}
}

let instance: PulseScheduler | null = null

export function getPulseScheduler(): PulseScheduler {
	if (!instance) {
		instance = new PulseScheduler()
	}
	return instance
}
