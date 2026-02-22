export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export type TaskHandler = (payload: Record<string, unknown>) => Promise<unknown>

export interface ScheduledTask {
	id: string
	name: string
	description: string
	cron: string
	enabled: boolean
	handler: string
	payload: Record<string, unknown>
	lastRunAt: number | null
	nextRunAt: number | null
	status: TaskStatus
	retryCount: number
	maxRetries: number
	createdAt: number
}

export interface TaskResult {
	taskId: string
	success: boolean
	output: unknown
	duration: number
	error?: string
	timestamp: number
}

export interface TaskCreateParams {
	name: string
	description?: string
	cron: string
	handler: string
	payload?: Record<string, unknown>
	maxRetries?: number
}
