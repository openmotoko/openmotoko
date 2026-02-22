import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

async function corsPlugin(fastify: FastifyInstance) {
	const origin = process.env.OPENMOTOKO_CORS_ORIGIN ?? 'http://localhost:5173'

	await fastify.register(import('@fastify/cors'), {
		origin,
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
	})
}

export default fp(corsPlugin, { name: 'cors' })
