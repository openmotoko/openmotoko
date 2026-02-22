import Fastify from 'fastify'
import authPlugin from './plugins/auth.js'
import corsPlugin from './plugins/cors.js'
import rateLimitPlugin from './plugins/rate-limit.js'
import registerWebSocket from './plugins/websocket.js'
import activityRoutes from './routes/activity.js'
import authRoutes from './routes/auth.js'
import channelRoutes from './routes/channels.js'
import conversationRoutes from './routes/conversations.js'
import healthRoutes from './routes/health.js'
import messageRoutes from './routes/messages.js'
import settingsRoutes from './routes/settings.js'
import skillRoutes from './routes/skills.js'

export async function createServer() {
	const fastify = Fastify({
		logger: {
			level: process.env.LOG_LEVEL ?? 'info',
		},
	})

	await fastify.register(corsPlugin)
	await fastify.register(rateLimitPlugin)
	await fastify.register(authPlugin)

	await fastify.register(registerWebSocket)

	await fastify.register(async (scope) => {
		await scope.register(healthRoutes)
		await scope.register(authRoutes)
		await scope.register(conversationRoutes)
		await scope.register(messageRoutes)
		await scope.register(activityRoutes)
		await scope.register(settingsRoutes)
		await scope.register(skillRoutes)
		await scope.register(channelRoutes)
	})

	return fastify
}
