import { nanoid } from 'nanoid'
import { eventBus } from '../events/bus.js'
import type { LLMRouter } from '../llm/router.js'
import type { LLMMessage, LLMResponse } from '../llm/types.js'
import type { AgentInstance, AgentStatus, SpawnOptions, SubAgentResult } from './types.js'

const MAX_TURNS = 10

export class SubAgent {
	readonly instance: AgentInstance
	private router: LLMRouter
	private messages: LLMMessage[] = []

	constructor(parentId: string, options: SpawnOptions, router: LLMRouter, conversationId: string) {
		this.router = router
		this.instance = {
			id: nanoid(),
			parentId,
			name: options.name ?? `sub-${nanoid(6)}`,
			role: 'sub',
			model: options.model ?? 'fast',
			systemPrompt: `You are a specialized sub-agent. Your task: ${options.task}`,
			status: 'idle',
			budget: options.budget ?? 1.0,
			spent: 0,
			conversationId,
			createdAt: Date.now(),
			completedAt: null,
			output: null,
		}
	}

	async run(): Promise<SubAgentResult> {
		const start = performance.now()
		this.setStatus('running')

		eventBus.emit('agent:spawned', {
			type: 'agent:spawned',
			agentId: this.instance.id,
			parentId: this.instance.parentId!,
			name: this.instance.name,
			model: this.instance.model,
		})

		this.messages.push({
			role: 'system',
			content: this.instance.systemPrompt,
		})

		let response: LLMResponse | undefined
		let turns = 0

		try {
			while (turns < MAX_TURNS) {
				turns++

				if (this.instance.spent >= this.instance.budget) {
					this.instance.output = 'Budget exceeded'
					this.setStatus('failed')
					break
				}

				response = await this.router.chat(this.messages, { model: this.instance.model })
				this.instance.spent += response.usage.cost

				if (!response.toolCalls || response.toolCalls.length === 0) {
					this.instance.output = response.content
					this.setStatus('completed')
					break
				}

				this.messages.push({
					role: 'assistant',
					content: response.content ?? '',
					toolCalls: response.toolCalls,
				})

				for (const tc of response.toolCalls) {
					this.messages.push({
						role: 'tool',
						content: JSON.stringify({
							success: false,
							error: 'Sub-agents cannot use tools directly',
						}),
						toolResults: [{ callId: tc.id, output: 'Sub-agents cannot use tools directly' }],
					})
				}
			}

			if (!this.instance.output && response) {
				this.instance.output = response.content
				this.setStatus('completed')
			}
		} catch (err) {
			this.instance.output = err instanceof Error ? err.message : 'Sub-agent execution failed'
			this.setStatus('failed')
		}

		const durationMs = Math.round(performance.now() - start)
		this.instance.completedAt = Date.now()

		const eventType = this.instance.status === 'completed' ? 'agent:completed' : 'agent:failed'
		eventBus.emit(eventType, {
			type: eventType,
			agentId: this.instance.id,
			parentId: this.instance.parentId!,
			name: this.instance.name,
			output: this.instance.output ?? '',
			durationMs,
		})

		return {
			agentId: this.instance.id,
			status: this.instance.status,
			output: this.instance.output ?? '',
			tokensUsed: 0,
			costIncurred: this.instance.spent,
			durationMs,
		}
	}

	private setStatus(status: AgentStatus): void {
		this.instance.status = status
	}
}
