import { extractTailscaleHeaders } from '@openmotoko/core'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

const TAILSCALE_ENABLED = process.env.TAILSCALE_ENABLED === 'true'

const TRUSTED_PROXIES = new Set(
	(process.env.TAILSCALE_TRUSTED_PROXIES ?? '127.0.0.1,::1').split(',').map((s) => s.trim()),
)

async function tailscaleAuthPlugin(fastify: FastifyInstance) {
	fastify.decorateRequest('tailscaleUser', null)

	if (!TAILSCALE_ENABLED) return

	fastify.addHook('onRequest', async (request) => {
		if (!TRUSTED_PROXIES.has(request.ip)) return

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
