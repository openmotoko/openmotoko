import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

async function rateLimitPlugin(fastify: FastifyInstance) {
	await fastify.register(import('@fastify/rate-limit'), {
		max: 100,
		timeWindow: '1 minute',
		errorResponseBuilder: (_request, context) => ({
			error: `Rate limit exceeded, retry in ${context.after}`,
			code: 'RATE_LIMIT_EXCEEDED',
		}),
	})
}

export default fp(rateLimitPlugin, { name: 'rate-limit' })
