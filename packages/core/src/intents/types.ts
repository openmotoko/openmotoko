export type IntentSource = 'pulse' | 'user-request' | 'follow-up' | 'observation'
export type ImpactLevel = 'read-only' | 'reversible' | 'irreversible'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type IntentStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'expired' | 'edited'
export type ApprovalType = 'autonomous' | 'user-approved' | 'user-edited' | 'user-rejected'

export interface PlannedAction {
	skill: string
	tool: string
	parameters: Record<string, unknown>
	riskLevel: RiskLevel
	reversible: boolean
}

export interface AgentIntent {
	id: string
	timestamp: number
	source: IntentSource
	summary: string
	reasoning: string
	confidence: number
	impact: ImpactLevel
	actions: PlannedAction[]
	estimatedCost: number
	requiresApproval: boolean
	suggestedResponse?: string
	alternatives?: string[]
	status: IntentStatus
	conversationId?: string
	channelType?: string
	expiresAt?: number
}
