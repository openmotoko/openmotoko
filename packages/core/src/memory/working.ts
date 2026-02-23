import { desc, eq } from 'drizzle-orm'
import { getDb } from '../db/client.js'
import { messages } from '../db/schema.js'
import type { LLMMessage } from '../llm/types.js'
import { workingMemorySummaries } from './schema.js'

const WINDOW_SIZE = 20
const SUMMARY_THRESHOLD = 40

export class WorkingMemory {
	async getContext(conversationId: string): Promise<{
		summary: string | null
		recentMessages: LLMMessage[]
	}> {
		const db = getDb()

		const [summaryRow] = db
			.select()
			.from(workingMemorySummaries)
			.where(eq(workingMemorySummaries.conversationId, conversationId))
			.orderBy(desc(workingMemorySummaries.createdAt))
			.limit(1)
			.all()

		const recent = db
			.select()
			.from(messages)
			.where(eq(messages.conversationId, conversationId))
			.orderBy(desc(messages.createdAt))
			.limit(WINDOW_SIZE)
			.all()
			.reverse()

		const recentMessages: LLMMessage[] = recent.map((m) => ({
			role: m.role as LLMMessage['role'],
			content: m.content,
		}))

		return {
			summary: summaryRow?.summary ?? null,
			recentMessages,
		}
	}

	async shouldSummarize(conversationId: string): Promise<boolean> {
		const db = getDb()

		const [summaryRow] = db
			.select()
			.from(workingMemorySummaries)
			.where(eq(workingMemorySummaries.conversationId, conversationId))
			.orderBy(desc(workingMemorySummaries.createdAt))
			.limit(1)
			.all()

		const totalMessages = db
			.select()
			.from(messages)
			.where(eq(messages.conversationId, conversationId))
			.all().length

		const summarizedCount = summaryRow?.messageCount ?? 0
		return totalMessages - summarizedCount > SUMMARY_THRESHOLD
	}

	async saveSummary(conversationId: string, summary: string, messageCount: number): Promise<void> {
		const db = getDb()
		db.insert(workingMemorySummaries).values({ conversationId, summary, messageCount }).run()
	}
}
