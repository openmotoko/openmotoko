import crypto from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

interface Session {
	userId: string
	createdAt: number
}

const sessions = new Map<string, Session>()

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

const PUBLIC_ROUTES = new Set(['/api/auth/login', '/health'])

export function createSession(userId: string): string {
	const token = crypto.randomBytes(32).toString('hex')
	sessions.set(token, { userId, createdAt: Date.now() })
	return token
}

export function destroySession(token: string): boolean {
	return sessions.delete(token)
}

export function getSession(token: string): Session | undefined {
	const session = sessions.get(token)
	if (!session) return undefined
	if (Date.now() - session.createdAt > SESSION_MAX_AGE_MS) {
		sessions.delete(token)
		return undefined
	}
	return session
}

export function pruneExpiredSessions(): void {
	const now = Date.now()
	for (const [token, session] of sessions) {
		if (now - session.createdAt > SESSION_MAX_AGE_MS) {
			sessions.delete(token)
		}
	}
}

declare module 'fastify' {
	interface FastifyRequest {
		userId: string
	}
}

async function authPlugin(fastify: FastifyInstance) {
	await fastify.register(import('@fastify/cookie'))

	fastify.decorateRequest('userId', '')

	const pruneInterval = setInterval(pruneExpiredSessions, 60 * 60 * 1000)
	fastify.addHook('onClose', () => clearInterval(pruneInterval))

	fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
		const urlPath = request.url.split('?')[0]
		if (PUBLIC_ROUTES.has(urlPath)) return
		if (urlPath === '/ws') return

		const token = request.cookies.session
		if (!token) {
			return reply.status(401).send({
				error: 'Authentication required',
				code: 'UNAUTHORIZED',
			})
		}

		const session = getSession(token)
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
