import { and, eq, lt } from 'drizzle-orm'
import { getDb } from '../db/client.js'
import { messages } from '../db/schema.js'
import type { CompactionResult } from './types.js'

const COMPACTION_THRESHOLD = 8000
const KEEP_RECENT = 10

export function shouldCompact(tokenCount: number): boolean {
	return tokenCount > COMPACTION_THRESHOLD
}

export async function compactSession(
	conversationId: string,
	summarize: (text: string) => Promise<string>,
): Promise<CompactionResult> {
	const db = getDb()

	const allMessages = db
		.select()
		.from(messages)
		.where(eq(messages.conversationId, conversationId))
		.orderBy(messages.createdAt)
		.all()

	if (allMessages.length <= KEEP_RECENT) {
		return { originalTokens: 0, compactedTokens: 0, summary: '', messagesRemoved: 0 }
	}

	const toCompact = allMessages.slice(0, -KEEP_RECENT)
	const originalTokens = toCompact.reduce((sum, m) => sum + (m.tokens ?? 0), 0)

	const text = toCompact.map((m) => `${m.role}: ${m.content}`).join('\n')

	const summary = await summarize(text)

	const cutoff = toCompact[toCompact.length - 1].createdAt
	db.delete(messages)
		.where(and(eq(messages.conversationId, conversationId), lt(messages.createdAt, cutoff + 1)))
		.run()

	const estimatedTokens = Math.ceil(summary.length / 4)

	return {
		originalTokens,
		compactedTokens: estimatedTokens,
		summary,
		messagesRemoved: toCompact.length,
	}
}
