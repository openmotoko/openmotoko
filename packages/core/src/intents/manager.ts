import { and, desc, eq, lte } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { getDb } from '../db/client.js'
import { intents } from './schema.js'
import type { AgentIntent, IntentStatus, PlannedAction } from './types.js'

export class IntentManager {
	async create(intent: Omit<AgentIntent, 'id' | 'timestamp' | 'status'>): Promise<AgentIntent> {
		const db = getDb()
		const full: AgentIntent = {
			...intent,
			id: nanoid(),
			timestamp: Date.now(),
			status: intent.requiresApproval ? 'pending' : 'approved',
		}

		db.insert(intents)
			.values({
				id: full.id,
				source: full.source,
				summary: full.summary,
				reasoning: full.reasoning,
				confidence: full.confidence,
				impact: full.impact,
				actions: JSON.stringify(full.actions),
				estimatedCost: full.estimatedCost,
				requiresApproval: full.requiresApproval ? 1 : 0,
				suggestedResponse: full.suggestedResponse,
				alternatives: full.alternatives ? JSON.stringify(full.alternatives) : null,
				status: full.status,
				conversationId: full.conversationId,
				channelType: full.channelType,
				expiresAt: full.expiresAt,
			})
			.run()

		return full
	}

	async approve(intentId: string): Promise<AgentIntent | null> {
		return this.updateStatus(intentId, 'approved', 'user-approved')
	}

	async reject(intentId: string): Promise<AgentIntent | null> {
		return this.updateStatus(intentId, 'rejected', 'user-rejected')
	}

	async markExecuted(intentId: string): Promise<void> {
		const db = getDb()
		db.update(intents)
			.set({ status: 'executed', resolvedAt: Date.now() })
			.where(eq(intents.id, intentId))
			.run()
	}

	async edit(
		intentId: string,
		updates: { suggestedResponse?: string; actions?: PlannedAction[] },
	): Promise<AgentIntent | null> {
		const db = getDb()
		const setValues: Record<string, unknown> = {
			status: 'edited',
			resolvedBy: 'user-edited',
			resolvedAt: Date.now(),
		}
		if (updates.suggestedResponse !== undefined) {
			setValues.suggestedResponse = updates.suggestedResponse
		}
		if (updates.actions) {
			setValues.actions = JSON.stringify(updates.actions)
		}
		db.update(intents).set(setValues).where(eq(intents.id, intentId)).run()
		return this.get(intentId)
	}

	async get(intentId: string): Promise<AgentIntent | null> {
		const db = getDb()
		const [row] = db.select().from(intents).where(eq(intents.id, intentId)).all()
		if (!row) return null
		return this.rowToIntent(row)
	}

	async getPending(conversationId?: string): Promise<AgentIntent[]> {
		const db = getDb()
		const conditions = [eq(intents.status, 'pending')]
		if (conversationId) {
			conditions.push(eq(intents.conversationId, conversationId))
		}
		const rows = db
			.select()
			.from(intents)
			.where(and(...conditions))
			.orderBy(desc(intents.createdAt))
			.all()
		return rows.map((r) => this.rowToIntent(r))
	}

	async getRecent(limit = 50): Promise<AgentIntent[]> {
		const db = getDb()
		const rows = db.select().from(intents).orderBy(desc(intents.createdAt)).limit(limit).all()
		return rows.map((r) => this.rowToIntent(r))
	}

	async expireOld(): Promise<number> {
		const db = getDb()
		const now = Date.now()
		const result = db
			.update(intents)
			.set({ status: 'expired' })
			.where(and(eq(intents.status, 'pending'), lte(intents.expiresAt, now)))
			.run()
		return result.changes
	}

	private async updateStatus(
		intentId: string,
		status: IntentStatus,
		resolvedBy: string,
	): Promise<AgentIntent | null> {
		const db = getDb()
		db.update(intents)
			.set({ status, resolvedBy, resolvedAt: Date.now() })
			.where(eq(intents.id, intentId))
			.run()
		return this.get(intentId)
	}

	private rowToIntent(row: typeof intents.$inferSelect): AgentIntent {
		return {
			id: row.id,
			timestamp: row.createdAt,
			source: row.source as AgentIntent['source'],
			summary: row.summary,
			reasoning: row.reasoning,
			confidence: row.confidence,
			impact: row.impact as AgentIntent['impact'],
			actions: JSON.parse(row.actions) as PlannedAction[],
			estimatedCost: row.estimatedCost,
			requiresApproval: row.requiresApproval === 1,
			suggestedResponse: row.suggestedResponse ?? undefined,
			alternatives: row.alternatives ? (JSON.parse(row.alternatives) as string[]) : undefined,
			status: row.status as IntentStatus,
			conversationId: row.conversationId ?? undefined,
			channelType: row.channelType ?? undefined,
			expiresAt: row.expiresAt ?? undefined,
		}
	}
}

let instance: IntentManager | null = null

export function getIntentManager(): IntentManager {
	if (!instance) {
		instance = new IntentManager()
	}
	return instance
}
