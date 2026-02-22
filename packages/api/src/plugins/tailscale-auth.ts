import { extractTailscaleHeaders } from '@openmotoko/core'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

async function tailscaleAuthPlugin(fastify: FastifyInstance) {
	fastify.decorateRequest('tailscaleUser', null)

	fastify.addHook('onRequest', async (request) => {
		const headers = request.headers as Record<string, string | undefined>
		const { userLogin } = extractTailscaleHeaders(headers)

		if (userLogin) {
			;(request as unknown as Record<string, unknown>).tailscaleUser = {
				loginName: userLogin,
				userName: headers['tailscale-user-name'] ?? null,
			}
		}
	})
}

export default fp(tailscaleAuthPlugin, { name: 'tailscale-auth' })
