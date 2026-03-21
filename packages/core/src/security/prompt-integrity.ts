import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'
import { getDb } from '../db/index.js'

export interface PromptVerifyResult {
	valid: boolean
	expectedHash?: string
	actualHash?: string
}

export const promptHashes = sqliteTable('prompt_hashes', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	conversationId: text().notNull().unique(),
	hash: text().notNull(),
	createdAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
})

export type PromptHashRow = typeof promptHashes.$inferSelect

function hashPrompt(prompt: string): string {
	return createHash('sha256').update(prompt, 'utf-8').digest('hex')
}

export class PromptIntegrity {
	/** In-memory cache for fast lookups: conversationId -> SHA-256 hash */
	private _cache: Map<string, string> = new Map()

	/** Public accessor for synchronous cache lookups */
	getCachedHash(conversationId: string): string | undefined {
		return this._cache.get(conversationId)
	}

	private db() {
		return getDb()
	}

	/**
	 * Register a system prompt for a conversation.
	 * Computes SHA-256 hash, stores in both memory and DB.
	 * Returns the hash.
	 */
	async register(conversationId: string, systemPrompt: string): Promise<string> {
		const hash = hashPrompt(systemPrompt)
		this._cache.set(conversationId, hash)

		const db = this.db()

		// Upsert: remove existing then insert
		await db.delete(promptHashes).where(eq(promptHashes.conversationId, conversationId))
		await db.insert(promptHashes).values({
			id: nanoid(),
			conversationId,
			hash,
			createdAt: Date.now(),
		})

		return hash
	}

	/**
	 * Verify that a system prompt has not been tampered with.
	 * Checks in-memory cache first, falls back to DB.
	 */
	async verify(conversationId: string, systemPrompt: string): Promise<PromptVerifyResult> {
		const expectedHash = await this.getHash(conversationId)

		if (expectedHash === null) {
			return { valid: false }
		}

		const actualHash = hashPrompt(systemPrompt)
		const valid = expectedHash === actualHash

		return {
			valid,
			expectedHash,
			actualHash,
		}
	}

	/**
	 * Get the registered hash for a conversation.
	 * Checks in-memory cache first, falls back to DB.
	 */
	async getHash(conversationId: string): Promise<string | null> {
		// Check memory cache first
		const cached = this._cache.get(conversationId)
		if (cached !== undefined) return cached

		// Fall back to DB
		const db = this.db()
		const rows = await db
			.select({ hash: promptHashes.hash })
			.from(promptHashes)
			.where(eq(promptHashes.conversationId, conversationId))
			.limit(1)

		if (rows.length === 0) return null

		// Populate cache
		const hash = rows[0].hash
		this._cache.set(conversationId, hash)
		return hash
	}

	/**
	 * Remove the registered hash for a conversation.
	 * Clears both in-memory cache and DB entry.
	 */
	async remove(conversationId: string): Promise<void> {
		this._cache.delete(conversationId)

		const db = this.db()
		await db.delete(promptHashes).where(eq(promptHashes.conversationId, conversationId))
	}
}

export const promptIntegrity = new PromptIntegrity()

/**
 * Convenience: register a system prompt hash.
 */
export async function registerPromptIntegrity(
	conversationId: string,
	systemPrompt: string,
): Promise<string> {
	return promptIntegrity.register(conversationId, systemPrompt)
}

/**
 * Convenience: synchronous verification using in-memory cache only.
 * Returns null if no hash is registered (first message in conversation).
 * For async verification with DB fallback, use promptIntegrity.verify().
 */
export function verifyPromptIntegrity(
	conversationId: string,
	systemPrompt: string,
): PromptVerifyResult | null {
	const cached = promptIntegrity.getCachedHash(conversationId)
	if (cached === undefined) return null

	const actualHash = createHash('sha256').update(systemPrompt, 'utf-8').digest('hex')
	return {
		valid: cached === actualHash,
		expectedHash: cached,
		actualHash,
	}
}
