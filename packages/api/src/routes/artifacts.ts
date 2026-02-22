import { artifactManager } from '@openmotoko/core'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'

const idParamsSchema = z.object({ id: z.string().min(1).max(128) })

const versionParamsSchema = z.object({
	id: z.string().min(1).max(128),
	version: z.string().regex(/^\d+$/),
})

const listQuerySchema = z.object({ conversationId: z.string().min(1).max(128) })

const createSchema = z.object({
	conversationId: z.string(),
	type: z.enum(['code', 'markdown', 'html', 'mermaid', 'text']),
	title: z.string(),
	content: z.string(),
	language: z.string().optional(),
})

const updateSchema = z.object({
	content: z.string(),
	title: z.string().optional(),
	type: z.enum(['code', 'markdown', 'html', 'mermaid', 'text']).optional(),
	language: z.string().optional(),
})

export default async function artifactRoutes(fastify: FastifyInstance) {
	fastify.get(
		'/api/artifacts',
		{ preHandler: validate({ query: listQuerySchema }) },
		async (request) => {
			const { conversationId } = request.query as { conversationId: string }
			return artifactManager.getByConversation(conversationId)
		},
	)

	fastify.get<{ Params: { id: string } }>(
		'/api/artifacts/:id',
		{ preHandler: validate({ params: idParamsSchema }) },
		async (request, reply) => {
			const artifact = await artifactManager.get(request.params.id)
			if (!artifact) {
				return reply.status(404).send({ error: 'Artifact not found', code: 'NOT_FOUND' })
			}
			return artifact
		},
	)

	fastify.post(
		'/api/artifacts',
		{ preHandler: validate({ body: createSchema }) },
		async (request) => {
			return artifactManager.create(request.body as z.infer<typeof createSchema>)
		},
	)

	fastify.patch<{ Params: { id: string } }>(
		'/api/artifacts/:id',
		{ preHandler: validate({ params: idParamsSchema, body: updateSchema }) },
		async (request, reply) => {
			try {
				return await artifactManager.update(
					request.params.id,
					request.body as z.infer<typeof updateSchema>,
				)
			} catch (_err) {
				return reply.status(404).send({ error: 'Artifact not found', code: 'NOT_FOUND' })
			}
		},
	)

	fastify.delete<{ Params: { id: string } }>(
		'/api/artifacts/:id',
		{ preHandler: validate({ params: idParamsSchema }) },
		async (request, _reply) => {
			await artifactManager.delete(request.params.id)
			return { success: true }
		},
	)

	fastify.get<{ Params: { id: string } }>(
		'/api/artifacts/:id/versions',
		{ preHandler: validate({ params: idParamsSchema }) },
		async (request) => {
			return artifactManager.getVersions(request.params.id)
		},
	)

	fastify.get<{ Params: { id: string; version: string } }>(
		'/api/artifacts/:id/versions/:version',
		{ preHandler: validate({ params: versionParamsSchema }) },
		async (request, reply) => {
			const version = Number.parseInt(request.params.version, 10)
			const result = await artifactManager.getVersion(request.params.id, version)
			if (!result) {
				return reply.status(404).send({ error: 'Version not found', code: 'NOT_FOUND' })
			}
			return result
		},
	)
}
