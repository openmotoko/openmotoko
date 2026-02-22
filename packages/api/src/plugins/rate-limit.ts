import type { FastifyInstance, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

async function rateLimitPlugin(fastify: FastifyInstance) {
	await fastify.register(import('@fastify/rate-limit'), {
		max: (request: FastifyRequest) => {
			const urlPath = request.url.split('?')[0]
			if (urlPath === '/api/auth/login') return 10
			if (urlPath.startsWith('/api/webhooks/') && urlPath.endsWith('/trigger')) return 30
			return 100
		},
		timeWindow: '1 minute',
		errorResponseBuilder: (_request, context) => ({
			error: `Rate limit exceeded, retry in ${context.after}`,
			code: 'RATE_LIMIT_EXCEEDED',
		}),
	})
}

export default fp(rateLimitPlugin, { name: 'rate-limit' })
