import crypto from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

interface Session {
	userId: string
	createdAt: number
}

const sessions = new Map<string, Session>()

const PUBLIC_ROUTES = new Set(['/api/auth/login'])

export function createSession(userId: string): string {
	const token = crypto.randomBytes(32).toString('hex')
	sessions.set(token, { userId, createdAt: Date.now() })
	return token
}

export function destroySession(token: string): boolean {
	return sessions.delete(token)
}

export function getSession(token: string): Session | undefined {
	return sessions.get(token)
}

declare module 'fastify' {
	interface FastifyRequest {
		userId: string
	}
}

async function authPlugin(fastify: FastifyInstance) {
	await fastify.register(import('@fastify/cookie'))

	fastify.decorateRequest('userId', '')

	fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
		if (PUBLIC_ROUTES.has(request.url)) return
		if (request.url === '/ws') return

		const token = request.cookies.session
		if (!token) {
			return reply.status(401).send({
				error: 'Authentication required',
				code: 'UNAUTHORIZED',
			})
		}

		const session = sessions.get(token)
		if (!session) {
			return reply.status(401).send({
				error: 'Invalid or expired session',
				code: 'UNAUTHORIZED',
			})
		}

		request.userId = session.userId
	})
}

export default fp(authPlugin, { name: 'auth' })
