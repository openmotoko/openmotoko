import { createHmac, timingSafeEqual } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/client.js'
import { eventBus } from '../events/bus.js'
import { webhooks } from './schema.js'
import type { Webhook, WebhookCreateParams, WebhookHandler, WebhookPayload } from './types.js'

function rowToWebhook(row: typeof webhooks.$inferSelect): Webhook {
	return {
		...row,
		enabled: Boolean(row.enabled),
	}
}

export class WebhookManager {
	private handlers = new Map<string, WebhookHandler>()

	constructor() {
		this.registerHandler('default', this.defaultHandler.bind(this))
	}

	registerHandler(name: string, fn: WebhookHandler): void {
		this.handlers.set(name, fn)
	}

	async list(): Promise<Webhook[]> {
		const db = getDb()
		const rows = await db.select().from(webhooks)
		return rows.map(rowToWebhook)
	}

	async getById(id: string): Promise<Webhook | null> {
		const db = getDb()
		const [row] = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1)
		return row ? rowToWebhook(row) : null
	}

	async create(params: WebhookCreateParams): Promise<Webhook> {
		const db = getDb()
		const [row] = await db
			.insert(webhooks)
			.values({
				name: params.name,
				handler: params.handler ?? 'default',
				targetConversationId: params.targetConversationId ?? null,
			})
			.returning()
		return rowToWebhook(row)
	}

	async remove(id: string): Promise<boolean> {
		const db = getDb()
		const result = await db.delete(webhooks).where(eq(webhooks.id, id))
		return result.changes > 0
	}

	async toggle(id: string): Promise<Webhook | null> {
		const db = getDb()
		const existing = await this.getById(id)
		if (!existing) return null
		const newVal = existing.enabled ? 0 : 1
		await db.update(webhooks).set({ enabled: newVal }).where(eq(webhooks.id, id))
		return this.getById(id)
	}

	async processPayload(webhookId: string, payload: WebhookPayload): Promise<void> {
		const webhook = await this.getById(webhookId)
		if (!webhook) throw new Error('Webhook not found')
		if (!webhook.enabled) throw new Error('Webhook is disabled')

		const handler = this.handlers.get(webhook.handler)
		if (!handler) throw new Error(`Handler "${webhook.handler}" not registered`)

		await handler(webhook, payload)

		const db = getDb()
		await db.update(webhooks).set({ lastTriggeredAt: Date.now() }).where(eq(webhooks.id, webhookId))
	}

	verifySignature(secret: string, signature: string, body: string): boolean {
		const expected = createHmac('sha256', secret).update(body).digest('hex')
		if (expected.length !== signature.length) return false
		return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
	}

	private async defaultHandler(webhook: Webhook, payload: WebhookPayload): Promise<void> {
		if (!webhook.targetConversationId) return

		eventBus.emit('message:received', {
			type: 'message:received',
			conversationId: webhook.targetConversationId,
			role: 'user',
			content: typeof payload.body === 'string' ? payload.body : JSON.stringify(payload.body),
		})
	}
}

let instance: WebhookManager | null = null

export function getWebhookManager(): WebhookManager {
	if (!instance) {
		instance = new WebhookManager()
	}
	return instance
}
