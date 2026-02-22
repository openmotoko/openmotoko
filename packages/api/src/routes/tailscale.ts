import { detectTailscale, getNodes, getServeStatus, startServe, stopServe } from '@openmotoko/core'
import type { FastifyInstance } from 'fastify'

export default async function tailscaleRoutes(fastify: FastifyInstance) {
	fastify.get('/api/tailscale/status', async () => {
		const status = await detectTailscale()
		const serve = await getServeStatus()
		return { ...status, serve }
	})

	fastify.get('/api/tailscale/nodes', async () => {
		return getNodes()
	})

	fastify.post('/api/tailscale/serve/start', async (_request, reply) => {
		try {
			await startServe()
			const serve = await getServeStatus()
			return { success: true, serve }
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to start serve'
			return reply.status(500).send({ error: message, code: 'TAILSCALE_ERROR' })
		}
	})

	fastify.post('/api/tailscale/serve/stop', async (_request, reply) => {
		try {
			await stopServe()
			return { success: true }
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to stop serve'
			return reply.status(500).send({ error: message, code: 'TAILSCALE_ERROR' })
		}
	})
}
