import { timingSafeEqual } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'
import { createSession, destroySession } from '../plugins/auth.js'

const loginSchema = z.object({
	password: z.string().min(1).max(256),
})

const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000

setInterval(
	() => {
		const now = Date.now()
		for (const [ip, entry] of loginAttempts) {
			if (now > entry.resetAt) loginAttempts.delete(ip)
		}
	},
	60 * 60 * 1000,
)

function getClientIp(request: { ip: string }): string {
	return request.ip
}

function isLoginLocked(ip: string): boolean {
	const entry = loginAttempts.get(ip)
	if (!entry) return false
	if (Date.now() > entry.resetAt) {
		loginAttempts.delete(ip)
		return false
	}
	return entry.count >= MAX_LOGIN_ATTEMPTS
}

function recordFailedLogin(ip: string): void {
	const entry = loginAttempts.get(ip) ?? { count: 0, resetAt: Date.now() + LOGIN_LOCKOUT_MS }
	entry.count++
	entry.resetAt = Date.now() + LOGIN_LOCKOUT_MS
	loginAttempts.set(ip, entry)
}

function clearLoginAttempts(ip: string): void {
	loginAttempts.delete(ip)
}

function safeCompare(a: string, b: string): boolean {
	const bufA = Buffer.from(a, 'utf-8')
	const bufB = Buffer.from(b, 'utf-8')
	if (bufA.length !== bufB.length) {
		timingSafeEqual(bufA, bufA)
		return false
	}
	return timingSafeEqual(bufA, bufB)
}

export default async function authRoutes(fastify: FastifyInstance) {
	fastify.post(
		'/api/auth/login',
		{ preHandler: validate({ body: loginSchema }) },
		async (request, reply) => {
			const clientIp = getClientIp(request)

			if (isLoginLocked(clientIp)) {
				return reply.status(429).send({
					error: 'Too many login attempts. Try again later.',
					code: 'LOGIN_LOCKED',
				})
			}

			const body = request.body as { password: string }
			const expected = process.env.OPENMOTOKO_PASSWORD
			if (!expected) {
				return reply.status(500).send({
					error: 'Server password not configured',
					code: 'CONFIG_ERROR',
				})
			}

			if (!safeCompare(body.password, expected)) {
				recordFailedLogin(clientIp)
				return reply.status(401).send({
					error: 'Invalid password',
					code: 'INVALID_CREDENTIALS',
				})
			}

			clearLoginAttempts(clientIp)
			const token = createSession('owner')

			return reply
				.setCookie('session', token, {
					httpOnly: true,
					sameSite: 'strict',
					path: '/',
					secure: process.env.NODE_ENV === 'production',
					maxAge: 60 * 60 * 24 * 7,
				})
				.send({ ok: true })
		},
	)

	fastify.post('/api/auth/logout', async (request, reply) => {
		const token = request.cookies.session
		if (token) {
			destroySession(token)
		}

		return reply.clearCookie('session', { path: '/' }).send({ ok: true })
	})
}
