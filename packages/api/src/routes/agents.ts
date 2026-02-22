import { getAgentManager, getAgentRuntime } from '@openmotoko/core'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'

const idParamsSchema = z.object({ id: z.string().min(1).max(128) })

export default async function agentRoutes(fastify: FastifyInstance) {
	fastify.get('/api/agents', async (_request, reply) => {
		try {
			const runtime = getAgentRuntime()
			const manager = getAgentManager(runtime.getRouter())
			const agents = manager.listAll()
			return reply.send({ agents })
		} catch (err) {
			fastify.log.error(err, 'Failed to list agents')
			return reply.status(500).send({ error: 'Failed to list agents', code: 'INTERNAL_ERROR' })
		}
	})

	fastify.get<{ Params: { id: string } }>(
		'/api/agents/:id',
		{ preHandler: validate({ params: idParamsSchema }) },
		async (request, reply) => {
			try {
				const runtime = getAgentRuntime()
				const manager = getAgentManager(runtime.getRouter())
				const agent = manager.getAgent(request.params.id)
				if (!agent) return reply.status(404).send({ error: 'Agent not found' })
				return reply.send(agent)
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Failed to get agent'
				return reply.status(500).send({ error: message })
			}
		},
	)

	fastify.delete<{ Params: { id: string } }>(
		'/api/agents/:id',
		{ preHandler: validate({ params: idParamsSchema }) },
		async (request, reply) => {
			try {
				const runtime = getAgentRuntime()
				const manager = getAgentManager(runtime.getRouter())
				const killed = manager.killAgent(request.params.id)
				if (!killed)
					return reply.status(404).send({ error: 'Agent not found or already completed' })
				return reply.send({ success: true })
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Failed to kill agent'
				return reply.status(500).send({ error: message })
			}
		},
	)
}
