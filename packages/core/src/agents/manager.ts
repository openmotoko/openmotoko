import { eq } from 'drizzle-orm'
import { getDb } from '../db/client.js'
import { agents } from '../db/schema.js'
import type { LLMRouter } from '../llm/router.js'
import { SubAgent } from './sub-agent.js'
import type { AgentInstance, SpawnOptions, SubAgentResult } from './types.js'

const MAX_CONCURRENT = 4

export class AgentManager {
	private active = new Map<string, SubAgent>()
	private results = new Map<string, SubAgentResult>()
	private router: LLMRouter

	constructor(router: LLMRouter) {
		this.router = router
	}

	async spawn(parentId: string, options: SpawnOptions, conversationId: string): Promise<string> {
		if (this.getActiveCount() >= MAX_CONCURRENT) {
			throw new Error(`Max concurrent sub-agents (${MAX_CONCURRENT}) reached`)
		}

		const subAgent = new SubAgent(parentId, options, this.router, conversationId)
		this.active.set(subAgent.instance.id, subAgent)

		this.persistAgent(subAgent.instance)

		subAgent.run().then((result) => {
			this.results.set(subAgent.instance.id, result)
			this.active.delete(subAgent.instance.id)
			this.updateAgent(subAgent.instance)
		})

		return subAgent.instance.id
	}

	async waitForAgent(agentId: string, timeoutMs = 60_000): Promise<SubAgentResult> {
		const start = Date.now()

		while (Date.now() - start < timeoutMs) {
			const result = this.results.get(agentId)
			if (result) return result

			const active = this.active.get(agentId)
			if (!active) {
				throw new Error(`Agent "${agentId}" not found`)
			}

			await new Promise((resolve) => setTimeout(resolve, 500))
		}

		throw new Error(`Agent "${agentId}" timed out after ${timeoutMs}ms`)
	}

	async waitForAll(agentIds: string[], timeoutMs = 120_000): Promise<SubAgentResult[]> {
		const results: SubAgentResult[] = []
		for (const id of agentIds) {
			results.push(await this.waitForAgent(id, timeoutMs))
		}
		return results
	}

	getAgent(agentId: string): AgentInstance | undefined {
		const active = this.active.get(agentId)
		if (active) return active.instance

		const result = this.results.get(agentId)
		if (result) {
			return {
				id: agentId,
				parentId: null,
				name: '',
				role: 'sub',
				model: '',
				systemPrompt: '',
				status: result.status,
				budget: 0,
				spent: result.costIncurred,
				conversationId: '',
				createdAt: 0,
				completedAt: Date.now(),
				output: result.output,
			}
		}

		return undefined
	}

	listActive(): AgentInstance[] {
		return [...this.active.values()].map((a) => a.instance)
	}

	listAll(): AgentInstance[] {
		const activeInstances = this.listActive()
		const completedIds = new Set(activeInstances.map((a) => a.id))

		const completed: AgentInstance[] = []
		for (const [id, result] of this.results) {
			if (!completedIds.has(id)) {
				completed.push({
					id,
					parentId: null,
					name: '',
					role: 'sub',
					model: '',
					systemPrompt: '',
					status: result.status,
					budget: 0,
					spent: result.costIncurred,
					conversationId: '',
					createdAt: 0,
					completedAt: Date.now(),
					output: result.output,
				})
			}
		}

		return [...activeInstances, ...completed]
	}

	killAgent(agentId: string): boolean {
		const active = this.active.get(agentId)
		if (!active) return false
		this.active.delete(agentId)
		this.results.set(agentId, {
			agentId,
			status: 'failed',
			output: 'Killed by user',
			tokensUsed: 0,
			costIncurred: active.instance.spent,
			durationMs: Date.now() - active.instance.createdAt,
		})
		return true
	}

	getActiveCount(): number {
		return this.active.size
	}

	private persistAgent(instance: AgentInstance): void {
		try {
			const db = getDb()
			db.insert(agents)
				.values({
					id: instance.id,
					parentId: instance.parentId,
					name: instance.name,
					role: instance.role,
					model: instance.model,
					systemPrompt: instance.systemPrompt,
					status: instance.status,
					budget: instance.budget,
					spent: instance.spent,
					conversationId: instance.conversationId,
					createdAt: instance.createdAt,
					completedAt: null,
				})
				.run()
		} catch {
			void 0
		}
	}

	private updateAgent(instance: AgentInstance): void {
		try {
			const db = getDb()
			db.update(agents)
				.set({
					status: instance.status,
					spent: instance.spent,
					completedAt: instance.completedAt,
				})
				.where(eq(agents.id, instance.id))
				.run()
		} catch {
			void 0
		}
	}
}

let instance: AgentManager | null = null

export function getAgentManager(router?: LLMRouter): AgentManager {
	if (!instance) {
		if (!router) throw new Error('AgentManager requires LLMRouter on first initialization')
		instance = new AgentManager(router)
	}
	return instance
}
