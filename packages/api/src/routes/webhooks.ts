import { timingSafeEqual } from 'node:crypto'
import { GmailWebhook, getWebhookManager } from '@openmotoko/core'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'

const idParamsSchema = z.object({ id: z.string().min(1).max(128) })

const createSchema = z.object({
	name: z.string().min(1).max(100),
	handler: z.string().max(256).optional(),
	targetConversationId: z.string().max(128).optional(),
})

function safeCompareSecrets(a: string, b: string): boolean {
	const bufA = Buffer.from(a, 'utf-8')
	const bufB = Buffer.from(b, 'utf-8')
	if (bufA.length !== bufB.length) {
		timingSafeEqual(bufA, bufA)
		return false
	}
	return timingSafeEqual(bufA, bufB)
}

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

const gmailPushSchema = z.object({
	message: z.object({
		data: z.string().min(1),
		messageId: z.string().optional(),
		publishTime: z.string().optional(),
	}),
	subscription: z.string().min(1),
})

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
			if (!safeCompareSecrets(webhook.secret, secret)) {
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

	fastify.post(
		'/api/webhooks/gmail',
		{ preHandler: validate({ body: gmailPushSchema }) },
		async (request, reply) => {
			const gmail = getGmailWebhook()
			if (!gmail) {
				return reply.status(503).send({ error: 'Gmail not configured', code: 'UNAVAILABLE' })
			}

			const expectedSub = process.env.GMAIL_PUBSUB_SUBSCRIPTION
			const body = request.body as z.infer<typeof gmailPushSchema>
			if (expectedSub && body.subscription !== expectedSub) {
				return reply.status(403).send({ error: 'Invalid subscription', code: 'FORBIDDEN' })
			}

			await gmail.handlePushNotification(request.body)
			return reply.send({ ok: true })
		},
	)
}
