import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { getDb } from '../db/client.js'
import { sessions } from './schema.js'
import type { SessionCreateParams, SessionRouteKey } from './types.js'

export class SessionManager {
	createSession(params: SessionCreateParams): string {
		const db = getDb()
		const id = nanoid()
		db.insert(sessions)
			.values({
				id,
				conversationId: params.conversationId,
				channelId: params.channelId ?? null,
				senderId: params.senderId ?? null,
				model: params.model ?? null,
				systemPrompt: params.systemPrompt ?? null,
				tokenCount: 0,
				compactedAt: null,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			})
			.run()
		return id
	}

	getSession(sessionId: string) {
		const db = getDb()
		const [row] = db.select().from(sessions).where(eq(sessions.id, sessionId)).all()
		return row ?? null
	}

	getSessionForConversation(conversationId: string) {
		const db = getDb()
		const [row] = db
			.select()
			.from(sessions)
			.where(eq(sessions.conversationId, conversationId))
			.all()
		return row ?? null
	}

	findOrCreateSession(key: SessionRouteKey, conversationId: string): string {
		const db = getDb()
		const conditions = [eq(sessions.conversationId, conversationId)]
		if (key.channelId) conditions.push(eq(sessions.channelId, key.channelId))
		if (key.senderId) conditions.push(eq(sessions.senderId, key.senderId))

		const existing = db
			.select()
			.from(sessions)
			.where(and(...conditions))
			.limit(1)
			.all()

		if (existing.length > 0) return existing[0].id

		return this.createSession({
			conversationId,
			channelId: key.channelId,
			senderId: key.senderId,
		})
	}

	updateTokenCount(sessionId: string, tokens: number): void {
		const db = getDb()
		db.update(sessions)
			.set({ tokenCount: tokens, updatedAt: Date.now() })
			.where(eq(sessions.id, sessionId))
			.run()
	}

	markCompacted(sessionId: string): void {
		const db = getDb()
		db.update(sessions)
			.set({ compactedAt: Date.now(), updatedAt: Date.now() })
			.where(eq(sessions.id, sessionId))
			.run()
	}

	deleteSession(sessionId: string): void {
		const db = getDb()
		db.delete(sessions).where(eq(sessions.id, sessionId)).run()
	}
}
