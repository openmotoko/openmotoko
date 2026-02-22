export interface MessageReceivedEvent {
	type: 'message:received'
	conversationId: string
	role: string
	content: string
}

export interface MessageSentEvent {
	type: 'message:sent'
	conversationId: string
	role: string
	content: string
}

export interface ToolCalledEvent {
	type: 'tool:called'
	conversationId: string
	toolName: string
	args: Record<string, unknown>
}

export interface ToolResultEvent {
	type: 'tool:result'
	conversationId: string
	toolName: string
	result: unknown
}

export interface LlmStreamEvent {
	type: 'llm:stream'
	conversationId: string
	chunk: string
}

export interface LlmCompleteEvent {
	type: 'llm:complete'
	conversationId: string
	tokens: number
	cost: number
}

export interface CostUpdatedEvent {
	type: 'cost:updated'
	conversationId: string
	provider: string
	model: string
	cost: number
}

export interface SkillActivatedEvent {
	type: 'skill:activated'
	skillId: string
	conversationId: string
}

export interface ChannelMessageEvent {
	type: 'channel:message'
	channelId: string
	channelType: string
	content: string
}

export interface SchedulerStartedEvent {
	type: 'scheduler:started'
	taskId: string
	taskName: string
}

export interface SchedulerCompletedEvent {
	type: 'scheduler:completed'
	taskId: string
	taskName: string
	duration: number
}

export interface SchedulerFailedEvent {
	type: 'scheduler:failed'
	taskId: string
	taskName: string
	error: string
}

export type AgentEvent =
	| MessageReceivedEvent
	| MessageSentEvent
	| ToolCalledEvent
	| ToolResultEvent
	| LlmStreamEvent
	| LlmCompleteEvent
	| CostUpdatedEvent
	| SkillActivatedEvent
	| ChannelMessageEvent
	| SchedulerStartedEvent
	| SchedulerCompletedEvent
	| SchedulerFailedEvent

export type AgentEventType = AgentEvent['type']

export type AgentEventByType<T extends AgentEventType> = Extract<AgentEvent, { type: T }>

export interface AgentEventMap {
	'message:received': MessageReceivedEvent
	'message:sent': MessageSentEvent
	'tool:called': ToolCalledEvent
	'tool:result': ToolResultEvent
	'llm:stream': LlmStreamEvent
	'llm:complete': LlmCompleteEvent
	'cost:updated': CostUpdatedEvent
	'skill:activated': SkillActivatedEvent
	'channel:message': ChannelMessageEvent
	'scheduler:started': SchedulerStartedEvent
	'scheduler:completed': SchedulerCompletedEvent
	'scheduler:failed': SchedulerFailedEvent
}
