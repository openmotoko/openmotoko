import { GmailWebhook, getWebhookManager } from '@openmotoko/core'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'

const idParamsSchema = z.object({ id: z.string().min(1) })

const createSchema = z.object({
	name: z.string().min(1).max(100),
	handler: z.string().optional(),
	targetConversationId: z.string().optional(),
})

let gmailWebhook: GmailWebhook | null = null

function getGmailWebhook(): GmailWebhook | null {
	if (gmailWebhook) return gmailWebhook
	const key = process.env.GMAIL_SERVICE_ACCOUNT_KEY
	const topic = process.env.GMAIL_PUBSUB_TOPIC
	const sub = process.env.GMAIL_PUBSUB_SUBSCRIPTION
	const convo = process.env.GMAIL_TARGET_CONVERSATION_ID
	if (!key || !topic || !sub || !convo) return null
	gmailWebhook = new GmailWebhook({
		serviceAccountKey: key,
		topicName: topic,
		subscriptionName: sub,
		targetConversationId: convo,
	})
	return gmailWebhook
}

export default async function webhookRoutes(fastify: FastifyInstance) {
	const manager = getWebhookManager()

	fastify.get('/api/webhooks', async (_req, reply) => {
		const list = await manager.list()
		return reply.send(list)
	})

	fastify.post(
		'/api/webhooks',
		{ preHandler: validate({ body: createSchema }) },
		async (request, reply) => {
			const body = request.body as z.infer<typeof createSchema>
			const webhook = await manager.create(body)
			return reply.status(201).send(webhook)
		},
	)

	fastify.delete(
		'/api/webhooks/:id',
		{ preHandler: validate({ params: idParamsSchema }) },
		async (request, reply) => {
			const { id } = request.params as { id: string }
			const deleted = await manager.remove(id)
			if (!deleted) {
				return reply.status(404).send({ error: 'Webhook not found', code: 'NOT_FOUND' })
			}
			return reply.status(204).send()
		},
	)

	fastify.post(
		'/api/webhooks/:id/toggle',
		{ preHandler: validate({ params: idParamsSchema }) },
		async (request, reply) => {
			const { id } = request.params as { id: string }
			const webhook = await manager.toggle(id)
			if (!webhook) {
				return reply.status(404).send({ error: 'Webhook not found', code: 'NOT_FOUND' })
			}
			return reply.send(webhook)
		},
	)

	fastify.post(
		'/api/webhooks/:id/trigger',
		{ preHandler: validate({ params: idParamsSchema }) },
		async (request, reply) => {
			const { id } = request.params as { id: string }
			const secret = request.headers['x-webhook-secret'] as string | undefined
			if (!secret) {
				return reply.status(401).send({ error: 'Missing secret', code: 'UNAUTHORIZED' })
			}
			const webhook = await manager.getById(id)
			if (!webhook) {
				return reply.status(404).send({ error: 'Webhook not found', code: 'NOT_FOUND' })
			}
			if (webhook.secret !== secret) {
				return reply.status(403).send({ error: 'Invalid secret', code: 'FORBIDDEN' })
			}
			await manager.processPayload(id, {
				webhookId: id,
				headers: request.headers as Record<string, string>,
				body: request.body,
				receivedAt: Date.now(),
			})
			return reply.send({ ok: true })
		},
	)

	fastify.post('/api/webhooks/gmail', async (request, reply) => {
		const gmail = getGmailWebhook()
		if (!gmail) {
			return reply.status(503).send({ error: 'Gmail not configured', code: 'UNAVAILABLE' })
		}
		await gmail.handlePushNotification(request.body)
		return reply.send({ ok: true })
	})
}
