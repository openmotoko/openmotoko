import { getAgentManager, getAgentRuntime } from '@openmotoko/core'
import type { FastifyInstance } from 'fastify'

export default async function agentRoutes(fastify: FastifyInstance) {
	fastify.get('/api/agents', async (_request, reply) => {
		try {
			const runtime = getAgentRuntime()
			const manager = getAgentManager(runtime.getRouter())
			const agents = manager.listAll()
			return reply.send({ agents })
		} catch {
			return reply.send({ agents: [] })
		}
	})

	fastify.get('/api/agents/:id', async (request, reply) => {
		const { id } = request.params as { id: string }
		try {
			const runtime = getAgentRuntime()
			const manager = getAgentManager(runtime.getRouter())
			const agent = manager.getAgent(id)
			if (!agent) return reply.status(404).send({ error: 'Agent not found' })
			return reply.send(agent)
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to get agent'
			return reply.status(500).send({ error: message })
		}
	})

	fastify.delete('/api/agents/:id', async (request, reply) => {
		const { id } = request.params as { id: string }
		try {
			const runtime = getAgentRuntime()
			const manager = getAgentManager(runtime.getRouter())
			const killed = manager.killAgent(id)
			if (!killed) return reply.status(404).send({ error: 'Agent not found or already completed' })
			return reply.send({ success: true })
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to kill agent'
			return reply.status(500).send({ error: message })
		}
	})
}
