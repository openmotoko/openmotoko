const BASE_URL = '/api'

interface ApiError {
	error: string
	code: string
	details?: unknown
}

interface PaginationParams {
	limit?: number
	offset?: number
}

export interface Conversation {
	id: string
	title: string
	model: string
	systemPrompt: string | null
	channelId: string | null
	createdAt: number
	updatedAt: number
}

export interface Message {
	id: string
	conversationId: string
	role: 'user' | 'assistant' | 'tool' | 'system'
	content: string
	toolCalls: ToolCall[] | null
	toolResults: ToolResult[] | null
	tokens: number
	cost: number
	model: string
	provider: string
	createdAt: number
}

export interface ToolCall {
	id: string
	name: string
	input: unknown
}

export interface ToolResult {
	callId: string
	output: unknown
	duration: number
	status: 'success' | 'error'
}

export interface ActivityItem {
	id: string
	type: string
	conversationId: string | null
	channel: string | null
	skillId: string | null
	data: unknown
	createdAt: number
}

export interface Skill {
	id: string
	name: string
	version: string
	description: string
	manifest: SkillManifest
	enabled: boolean
	installedAt: number
}

export interface SkillManifest {
	capabilities: string[]
	tools: { name: string; description: string }[]
}

export interface SkillPermissions {
	filesystem: { read: boolean; write: boolean; paths: string[] }
	network: { outbound: boolean; domains: string[] }
	shell: { execute: boolean; allowedCommands: string[] }
	env: { read: boolean; keys: string[] }
}

export interface Settings {
	[key: string]: unknown
}

export interface Channel {
	id: string
	type: string
	enabled: boolean
	createdAt: number
}

export interface ConversationWithMessages extends Conversation {
	messages: Message[]
}

export interface CostSummary {
	total: number
	byProvider: Record<string, number>
	byModel: Record<string, number>
}

export interface CostHistoryEntry {
	date: string
	cost: number
	tokens: number
}

export interface CostBreakdown {
	providers: { name: string; cost: number; tokens: number }[]
	models: { name: string; cost: number; tokens: number }[]
}

export interface BudgetSettings {
	daily: number
	monthly: number
	alertThresholds: number[]
}

export interface ScheduledTaskItem {
	id: string
	name: string
	description: string
	cron: string
	enabled: boolean
	handler: string
	payload: Record<string, unknown>
	lastRunAt: number | null
	nextRunAt: number | null
	status: string
	retryCount: number
	maxRetries: number
	createdAt: number
}

export interface TaskRunItem {
	id: string
	taskId: string
	success: boolean
	output: unknown
	error: string | null
	duration: number
	createdAt: number
}

export interface TaskCreateData {
	name: string
	description?: string
	cron: string
	handler: string
	payload?: Record<string, unknown>
	maxRetries?: number
}

export interface WebhookItem {
	id: string
	name: string
	secret: string
	enabled: boolean
	targetConversationId: string | null
	handler: string
	lastTriggeredAt: number | null
	createdAt: number
}

class ApiClient {
	private async request<T>(path: string, options?: RequestInit): Promise<T> {
		const response = await fetch(`${BASE_URL}${path}`, {
			headers: {
				'Content-Type': 'application/json',
			},
			credentials: 'include',
			...options,
		})

		if (!response.ok) {
			const error: ApiError = await response.json().catch(() => ({
				error: 'Request failed',
				code: 'UNKNOWN',
			}))
			throw new Error(error.error)
		}

		return response.json()
	}

	async getConversations(params?: PaginationParams): Promise<Conversation[]> {
		const query = new URLSearchParams()
		if (params?.limit) query.set('limit', String(params.limit))
		if (params?.offset) query.set('offset', String(params.offset))
		const qs = query.toString()
		return this.request(`/conversations${qs ? `?${qs}` : ''}`)
	}

	async createConversation(data: {
		title?: string
		model?: string
		systemPrompt?: string
	}): Promise<Conversation> {
		return this.request('/conversations', {
			method: 'POST',
			body: JSON.stringify(data),
		})
	}

	async getConversation(id: string): Promise<ConversationWithMessages> {
		return this.request(`/conversations/${id}`)
	}

	async updateConversation(
		id: string,
		data: { model?: string; systemPrompt?: string; title?: string },
	): Promise<Conversation> {
		return this.request(`/conversations/${id}`, {
			method: 'PATCH',
			body: JSON.stringify(data),
		})
	}

	async deleteConversation(id: string): Promise<void> {
		await this.request(`/conversations/${id}`, { method: 'DELETE' })
	}

	async exportConversation(id: string): Promise<ConversationWithMessages> {
		return this.request(`/conversations/${id}/export`)
	}

	async compactConversation(id: string): Promise<Conversation> {
		return this.request(`/conversations/${id}/compact`, { method: 'POST' })
	}

	async sendMessage(conversationId: string, content: string): Promise<Message> {
		return this.request(`/conversations/${conversationId}/messages`, {
			method: 'POST',
			body: JSON.stringify({ content }),
		})
	}

	async getActivity(
		params?: PaginationParams & {
			channel?: string
			skillId?: string
			type?: string
		},
	): Promise<ActivityItem[]> {
		const query = new URLSearchParams()
		if (params?.limit) query.set('limit', String(params.limit))
		if (params?.offset) query.set('offset', String(params.offset))
		if (params?.channel) query.set('channel', params.channel)
		if (params?.skillId) query.set('skillId', params.skillId)
		if (params?.type) query.set('type', params.type)
		const qs = query.toString()
		return this.request(`/activity${qs ? `?${qs}` : ''}`)
	}

	async getSettings(): Promise<Settings> {
		return this.request('/settings')
	}

	async updateSettings(settings: Settings): Promise<Settings> {
		return this.request('/settings', {
			method: 'PUT',
			body: JSON.stringify(settings),
		})
	}

	async getSkills(): Promise<Skill[]> {
		return this.request('/skills')
	}

	async toggleSkill(id: string): Promise<Skill> {
		return this.request(`/skills/${id}/toggle`, {
			method: 'POST',
		})
	}

	async getChannels(): Promise<Channel[]> {
		return this.request('/channels')
	}

	async login(password: string): Promise<{ success: boolean }> {
		return this.request('/auth/login', {
			method: 'POST',
			body: JSON.stringify({ password }),
		})
	}

	async logout(): Promise<void> {
		await this.request('/auth/logout', {
			method: 'POST',
		})
	}

	async getCostsToday(): Promise<CostSummary> {
		return this.request('/costs/today')
	}

	async getCostHistory(days?: number): Promise<CostHistoryEntry[]> {
		return this.request(`/costs/history${days ? `?days=${days}` : ''}`)
	}

	async getCostBreakdown(period?: string): Promise<CostBreakdown> {
		return this.request(`/costs/breakdown${period ? `?period=${period}` : ''}`)
	}

	async getBudget(): Promise<BudgetSettings> {
		return this.request('/settings/budget')
	}

	async updateBudget(budget: BudgetSettings): Promise<BudgetSettings> {
		return this.request('/settings/budget', {
			method: 'PUT',
			body: JSON.stringify(budget),
		})
	}

	async getSkillManifest(id: string): Promise<SkillManifest> {
		return this.request(`/skills/${id}/manifest`)
	}

	async installSkill(data: { url: string }): Promise<Skill> {
		return this.request('/skills/install', {
			method: 'POST',
			body: JSON.stringify(data),
		})
	}

	async uninstallSkill(id: string): Promise<void> {
		return this.request(`/skills/${id}`, { method: 'DELETE' })
	}

	async getSkillPermissions(id: string): Promise<SkillPermissions> {
		return this.request(`/skills/${id}/permissions`)
	}

	async updateSkillPermissions(id: string, permissions: SkillPermissions): Promise<void> {
		return this.request(`/skills/${id}/permissions`, {
			method: 'PUT',
			body: JSON.stringify(permissions),
		})
	}

	async getWebhooks(): Promise<WebhookItem[]> {
		return this.request('/webhooks')
	}

	async createWebhook(data: { name: string; targetConversationId?: string }): Promise<WebhookItem> {
		return this.request('/webhooks', { method: 'POST', body: JSON.stringify(data) })
	}

	async deleteWebhook(id: string): Promise<void> {
		return this.request(`/webhooks/${id}`, { method: 'DELETE' })
	}

	async toggleWebhook(id: string): Promise<void> {
		return this.request(`/webhooks/${id}/toggle`, { method: 'POST' })
	}

	async getSchedulerTasks(): Promise<ScheduledTaskItem[]> {
		return this.request('/scheduler/tasks')
	}

	async createSchedulerTask(data: TaskCreateData): Promise<ScheduledTaskItem> {
		return this.request('/scheduler/tasks', {
			method: 'POST',
			body: JSON.stringify(data),
		})
	}

	async updateSchedulerTask(id: string, data: Partial<TaskCreateData>): Promise<ScheduledTaskItem> {
		return this.request(`/scheduler/tasks/${id}`, {
			method: 'PUT',
			body: JSON.stringify(data),
		})
	}

	async deleteSchedulerTask(id: string): Promise<void> {
		return this.request(`/scheduler/tasks/${id}`, { method: 'DELETE' })
	}

	async toggleSchedulerTask(id: string): Promise<ScheduledTaskItem> {
		return this.request(`/scheduler/tasks/${id}/toggle`, { method: 'POST' })
	}

	async runSchedulerTask(id: string): Promise<{ success: boolean }> {
		return this.request(`/scheduler/tasks/${id}/run`, { method: 'POST' })
	}

	async getTaskRuns(id: string): Promise<TaskRunItem[]> {
		return this.request(`/scheduler/tasks/${id}/runs`)
	}

	async getTailscaleStatus(): Promise<unknown> {
		return this.request('/tailscale/status')
	}

	async getTailscaleNodes(): Promise<unknown[]> {
		return this.request('/tailscale/nodes')
	}

	async startTailscaleServe(): Promise<{ success: boolean }> {
		return this.request('/tailscale/serve/start', { method: 'POST' })
	}

	async stopTailscaleServe(): Promise<{ success: boolean }> {
		return this.request('/tailscale/serve/stop', { method: 'POST' })
	}

	async getArtifacts(conversationId: string): Promise<unknown[]> {
		return this.request(`/artifacts?conversationId=${conversationId}`)
	}

	async getArtifact(id: string): Promise<unknown> {
		return this.request(`/artifacts/${id}`)
	}

	async createArtifact(data: {
		conversationId: string
		type: string
		title: string
		content: string
		language?: string
	}): Promise<unknown> {
		return this.request('/artifacts', { method: 'POST', body: JSON.stringify(data) })
	}

	async updateArtifact(id: string, data: { content: string; title?: string }): Promise<unknown> {
		return this.request(`/artifacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
	}

	async deleteArtifact(id: string): Promise<void> {
		return this.request(`/artifacts/${id}`, { method: 'DELETE' })
	}

	async getArtifactVersions(id: string): Promise<unknown[]> {
		return this.request(`/artifacts/${id}/versions`)
	}

	async getChannelPlugins(): Promise<unknown[]> {
		return this.request('/channel-plugins')
	}

	async installChannelPlugin(packageName: string): Promise<unknown> {
		return this.request('/channel-plugins/install', {
			method: 'POST',
			body: JSON.stringify({ packageName }),
		})
	}

	async uninstallChannelPlugin(pluginId: string): Promise<void> {
		return this.request(`/channel-plugins/${pluginId}`, { method: 'DELETE' })
	}
}

export const api = new ApiClient()
