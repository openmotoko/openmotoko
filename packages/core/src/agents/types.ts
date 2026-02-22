export type AgentRole = 'primary' | 'sub'

export type AgentStatus = 'idle' | 'running' | 'waiting' | 'completed' | 'failed'

export interface AgentConfig {
	name: string
	role: AgentRole
	model: string
	systemPrompt: string
	skills: string[]
	budget: number
	parentId?: string
	conversationId?: string
}

export interface SubAgentResult {
	agentId: string
	status: AgentStatus
	output: string
	tokensUsed: number
	costIncurred: number
	durationMs: number
}

export interface SpawnOptions {
	task: string
	name?: string
	model?: string
	skills?: string[]
	budget?: number
}

export interface AgentInstance {
	id: string
	parentId: string | null
	name: string
	role: AgentRole
	model: string
	systemPrompt: string
	status: AgentStatus
	budget: number
	spent: number
	conversationId: string
	createdAt: number
	completedAt: number | null
	output: string | null
}
