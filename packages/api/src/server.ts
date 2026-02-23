import helmet from '@fastify/helmet'
import { eventBus, watchConfig } from '@openmotoko/core'
import Fastify from 'fastify'
import authPlugin from './plugins/auth.js'
import corsPlugin from './plugins/cors.js'
import rateLimitPlugin from './plugins/rate-limit.js'
import tailscaleAuthPlugin from './plugins/tailscale-auth.js'
import registerWebSocket from './plugins/websocket.js'
import activityRoutes from './routes/activity.js'
import agentRoutes from './routes/agents.js'
import artifactRoutes from './routes/artifacts.js'
import authRoutes from './routes/auth.js'
import channelPluginRoutes from './routes/channel-plugins.js'
import channelRoutes from './routes/channels.js'
import conversationRoutes from './routes/conversations.js'
import costRoutes from './routes/costs.js'
import healthRoutes from './routes/health.js'
import messageRoutes from './routes/messages.js'
import openaiCompatRoutes from './routes/openai-compat.js'
import registryRoutes from './routes/registry.js'
import schedulerRoutes from './routes/scheduler.js'
import settingsRoutes from './routes/settings.js'
import skillRoutes from './routes/skills.js'
import tailscaleRoutes from './routes/tailscale.js'
import webhookRoutes from './routes/webhooks.js'

export async function createServer() {
	const fastify = Fastify({
		logger: {
			level: process.env.LOG_LEVEL ?? 'info',
		},
	})

	await fastify.register(helmet, {
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'", "'unsafe-inline'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				connectSrc: ["'self'", 'ws:', 'wss:'],
			},
		},
		crossOriginEmbedderPolicy: false,
	})
	await fastify.register(corsPlugin)
	await fastify.register(rateLimitPlugin)
	await fastify.register(authPlugin)
	await fastify.register(tailscaleAuthPlugin)

	await fastify.register(registerWebSocket)

	await fastify.register(async (scope) => {
		await scope.register(healthRoutes)
		await scope.register(authRoutes)
		await scope.register(conversationRoutes)
		await scope.register(messageRoutes)
		await scope.register(activityRoutes)
		await scope.register(settingsRoutes)
		await scope.register(skillRoutes)
		await scope.register(registryRoutes)
		await scope.register(channelRoutes)
		await scope.register(costRoutes)
		await scope.register(webhookRoutes)
		await scope.register(schedulerRoutes)
		await scope.register(artifactRoutes)
		await scope.register(tailscaleRoutes)
		await scope.register(agentRoutes)
		await scope.register(channelPluginRoutes)
		await scope.register(openaiCompatRoutes)
	})

	watchConfig(undefined, () => {
		eventBus.emit('config:changed', {
			type: 'config:changed',
			timestamp: Date.now(),
		})
	})

	return fastify
}
