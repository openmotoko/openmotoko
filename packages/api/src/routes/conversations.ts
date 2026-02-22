import { conversations, getDb, messages, nanoid } from '@openmotoko/core'
import { desc, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'

const createConversationSchema = z.object({
	title: z.string().optional(),
	model: z.string().optional(),
	systemPrompt: z.string().optional(),
})

const idParamsSchema = z.object({
	id: z.string().min(1),
})

export default async function conversationRoutes(fastify: FastifyInstance) {
	fastify.get('/api/conversations', async (_request, reply) => {
		const db = getDb()
		const rows = await db.select().from(conversations).orderBy(desc(conversations.updatedAt))

		return reply.send(rows)
	})

	fastify.post(
		'/api/conversations',
		{ preHandler: validate({ body: createConversationSchema }) },
		async (request, reply) => {
			const body = request.body as { title?: string; model?: string; systemPrompt?: string }
			const db = getDb()
			const now = Date.now()
			const id = nanoid()

			const conversation = {
				id,
				title: body.title ?? 'New Conversation',
				model: body.model ?? null,
				systemPrompt: body.systemPrompt ?? null,
				channelId: null,
				createdAt: now,
				updatedAt: now,
			}

			await db.insert(conversations).values(conversation)

			return reply.status(201).send(conversation)
		},
	)

	fastify.get(
		'/api/conversations/:id',
		{ preHandler: validate({ params: idParamsSchema }) },
		async (request, reply) => {
			const params = request.params as { id: string }
			const db = getDb()

			const [conversation] = await db
				.select()
				.from(conversations)
				.where(eq(conversations.id, params.id))
				.limit(1)

			if (!conversation) {
				return reply.status(404).send({
					error: 'Conversation not found',
					code: 'NOT_FOUND',
				})
			}

			const msgs = await db
				.select()
				.from(messages)
				.where(eq(messages.conversationId, params.id))
				.orderBy(messages.createdAt)

			return reply.send({ ...conversation, messages: msgs })
		},
	)
}
