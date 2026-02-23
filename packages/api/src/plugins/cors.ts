import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

async function corsPlugin(fastify: FastifyInstance) {
	const envOrigin = process.env.OPENMOTOKO_CORS_ORIGIN
	const origin =
		envOrigin ?? (process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173')

	await fastify.register(import('@fastify/cors'), {
		origin,
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
	})
}

export default fp(corsPlugin, { name: 'cors' })
