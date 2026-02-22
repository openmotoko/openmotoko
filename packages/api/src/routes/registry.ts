import { RegistryClient, SkillInstaller } from '@openmotoko/core'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'

const searchQuerySchema = z.object({
	q: z.string().optional(),
	tags: z.string().optional(),
	verified: z.enum(['true', 'false']).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
	offset: z.coerce.number().int().min(0).optional(),
})

const installBodySchema = z.object({
	id: z.string().min(1),
})

const idParamsSchema = z.object({
	id: z.string().min(1),
})

const client = new RegistryClient()
const installer = new SkillInstaller(client)

export default async function registryRoutes(fastify: FastifyInstance) {
	fastify.get(
		'/api/registry/search',
		{ preHandler: validate({ query: searchQuerySchema }) },
		async (request, reply) => {
			const query = request.query as z.infer<typeof searchQuerySchema>
			const tags = query.tags ? query.tags.split(',').map((t) => t.trim()) : undefined
			const verified =
				query.verified === 'true' ? true : query.verified === 'false' ? false : undefined

			const entries = await client.search({
				query: query.q,
				tags,
				verified,
				limit: query.limit,
				offset: query.offset,
			})

			return reply.send({ entries, total: entries.length })
		},
	)

	fastify.get('/api/registry/entries', async (_request, reply) => {
		const entries = await client.getEntries()
		return reply.send({ entries, total: entries.length })
	})

	fastify.post(
		'/api/registry/install',
		{ preHandler: validate({ body: installBodySchema }) },
		async (request, reply) => {
			const body = request.body as z.infer<typeof installBodySchema>
			try {
				const result = await installer.install(body.id)
				return reply.status(201).send(result)
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Installation failed'
				return reply.status(400).send({ error: message, code: 'INSTALL_FAILED' })
			}
		},
	)

	fastify.delete(
		'/api/registry/uninstall/:id',
		{ preHandler: validate({ params: idParamsSchema }) },
		async (request, reply) => {
			const params = request.params as z.infer<typeof idParamsSchema>
			try {
				await installer.uninstall(params.id)
				return reply.status(204).send()
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Uninstall failed'
				return reply.status(400).send({ error: message, code: 'UNINSTALL_FAILED' })
			}
		},
	)

	fastify.post('/api/registry/refresh', async (_request, reply) => {
		const entries = await client.refreshCache()
		return reply.send({ entries, total: entries.length })
	})
}
