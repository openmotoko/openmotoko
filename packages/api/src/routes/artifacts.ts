import { artifactManager } from '@openmotoko/core'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

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
	fastify.get('/api/artifacts', async (request) => {
		const { conversationId } = request.query as { conversationId?: string }
		if (!conversationId) {
			return { error: 'conversationId query parameter required' }
		}
		return artifactManager.getByConversation(conversationId)
	})

	fastify.get<{ Params: { id: string } }>('/api/artifacts/:id', async (request, reply) => {
		const artifact = await artifactManager.get(request.params.id)
		if (!artifact) {
			return reply.status(404).send({ error: 'Artifact not found', code: 'NOT_FOUND' })
		}
		return artifact
	})

	fastify.post('/api/artifacts', async (request, reply) => {
		const parsed = createSchema.safeParse(request.body)
		if (!parsed.success) {
			return reply
				.status(400)
				.send({ error: 'Invalid input', code: 'VALIDATION_ERROR', details: parsed.error })
		}
		return artifactManager.create(parsed.data)
	})

	fastify.patch<{ Params: { id: string } }>('/api/artifacts/:id', async (request, reply) => {
		const parsed = updateSchema.safeParse(request.body)
		if (!parsed.success) {
			return reply
				.status(400)
				.send({ error: 'Invalid input', code: 'VALIDATION_ERROR', details: parsed.error })
		}
		try {
			return await artifactManager.update(request.params.id, parsed.data)
		} catch (_err) {
			return reply.status(404).send({ error: 'Artifact not found', code: 'NOT_FOUND' })
		}
	})

	fastify.delete<{ Params: { id: string } }>('/api/artifacts/:id', async (request, _reply) => {
		await artifactManager.delete(request.params.id)
		return { success: true }
	})

	fastify.get<{ Params: { id: string } }>('/api/artifacts/:id/versions', async (request) => {
		return artifactManager.getVersions(request.params.id)
	})

	fastify.get<{ Params: { id: string; version: string } }>(
		'/api/artifacts/:id/versions/:version',
		async (request, reply) => {
			const version = Number.parseInt(request.params.version, 10)
			if (Number.isNaN(version)) {
				return reply.status(400).send({ error: 'Invalid version', code: 'VALIDATION_ERROR' })
			}
			const result = await artifactManager.getVersion(request.params.id, version)
			if (!result) {
				return reply.status(404).send({ error: 'Version not found', code: 'NOT_FOUND' })
			}
			return result
		},
	)
}
