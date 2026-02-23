import type { LLMMessage } from '../llm/types.js'
import { EpisodicMemoryStore } from './episodic.js'
import { ProceduralMemoryStore } from './procedural.js'
import { SemanticMemoryStore } from './semantic.js'
import { WorkingMemory } from './working.js'

export interface MemoryContext {
	summary: string | null
	recentMessages: LLMMessage[]
	relevantFacts: string[]
	relevantEpisodes: string[]
}

export class MemoryManager {
	readonly working = new WorkingMemory()
	readonly semantic = new SemanticMemoryStore()
	readonly episodic = new EpisodicMemoryStore()
	readonly procedural = new ProceduralMemoryStore()

	async getFullContext(conversationId: string, query?: string): Promise<MemoryContext> {
		const workingCtx = await this.working.getContext(conversationId)

		let relevantFacts: string[] = []
		let relevantEpisodes: string[] = []

		if (query) {
			const facts = await this.semantic.search(query, 5)
			relevantFacts = facts.filter((f) => f.score > 0.1).map((f) => f.entry.fact)

			const episodes = await this.episodic.search(query, 5)
			relevantEpisodes = episodes
				.filter((e) => e.score > 0.1)
				.map((e) => e.entry.summary ?? e.entry.content)
		}

		return {
			summary: workingCtx.summary,
			recentMessages: workingCtx.recentMessages,
			relevantFacts,
			relevantEpisodes,
		}
	}

	buildSystemPromptAddendum(context: MemoryContext): string {
		const parts: string[] = []

		if (context.summary) {
			parts.push(`Previous conversation summary:\n${context.summary}`)
		}

		if (context.relevantFacts.length > 0) {
			parts.push(`Known facts:\n${context.relevantFacts.map((f) => `- ${f}`).join('\n')}`)
		}

		if (context.relevantEpisodes.length > 0) {
			parts.push(
				`Related past interactions:\n${context.relevantEpisodes.map((e) => `- ${e}`).join('\n')}`,
			)
		}

		return parts.join('\n\n')
	}
}

let instance: MemoryManager | null = null

export function getMemoryManager(): MemoryManager {
	if (!instance) {
		instance = new MemoryManager()
	}
	return instance
}
