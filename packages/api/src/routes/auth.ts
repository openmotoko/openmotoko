import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'
import { createSession, destroySession } from '../plugins/auth.js'

const loginSchema = z.object({
	password: z.string().min(1),
})

export default async function authRoutes(fastify: FastifyInstance) {
	fastify.post(
		'/api/auth/login',
		{ preHandler: validate({ body: loginSchema }) },
		async (request, reply) => {
			const body = request.body as { password: string }
			const expected = process.env.OPENMOTOKO_PASSWORD
			if (!expected) {
				return reply.status(500).send({
					error: 'Server password not configured',
					code: 'CONFIG_ERROR',
				})
			}

			if (body.password !== expected) {
				return reply.status(401).send({
					error: 'Invalid password',
					code: 'INVALID_CREDENTIALS',
				})
			}

			const token = createSession('owner')

			return reply
				.setCookie('session', token, {
					httpOnly: true,
					sameSite: 'lax',
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
