import { getChannelPluginRegistry, loadChannelPlugin } from '@openmotoko/core'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'

const installBody = z.object({
	packageName: z.string().min(1),
})

const idParams = z.object({
	id: z.string().min(1),
})

export default async function channelPluginRoutes(fastify: FastifyInstance) {
	fastify.get('/api/channel-plugins', async (_request, reply) => {
		const registry = getChannelPluginRegistry()
		return reply.send(registry.getAllMeta())
	})

	fastify.post(
		'/api/channel-plugins/install',
		{ preHandler: validate({ body: installBody }) },
		async (request, reply) => {
			const { packageName } = request.body as { packageName: string }
			try {
				const plugin = await loadChannelPlugin(packageName)
				return reply.status(201).send({
					id: plugin.id,
					name: plugin.name,
					version: plugin.version,
				})
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Failed to install plugin'
				return reply.status(400).send({ error: message, code: 'PLUGIN_INSTALL_FAILED' })
			}
		},
	)

	fastify.delete(
		'/api/channel-plugins/:id',
		{ preHandler: validate({ params: idParams }) },
		async (request, reply) => {
			const { id } = request.params as { id: string }
			const registry = getChannelPluginRegistry()
			if (!registry.has(id)) {
				return reply.status(404).send({ error: 'Plugin not found' })
			}
			registry.unregister(id)
			return reply.status(204).send()
		},
	)
}
