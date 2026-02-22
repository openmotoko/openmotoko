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
}

export const api = new ApiClient()
