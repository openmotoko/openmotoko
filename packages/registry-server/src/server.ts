import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import Fastify from 'fastify'
import { initDb } from './db/client.js'
import publishRoutes from './routes/publish.js'
import ratingsRoutes from './routes/ratings.js'
import skillsRoutes from './routes/skills.js'

export async function createRegistryServer() {
	const fastify = Fastify({ logger: true })

	await fastify.register(cors, { origin: true })
	await fastify.register(rateLimit, { max: 100, timeWindow: '1 minute' })
	await fastify.register(multipart, { limits: { fileSize: 50_000_000, files: 1 } })

	initDb()

	await fastify.register(skillsRoutes)
	await fastify.register(publishRoutes)
	await fastify.register(ratingsRoutes)

	fastify.get('/health', async () => ({ status: 'ok' }))

	return fastify
}
