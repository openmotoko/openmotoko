import { getAgentRuntime } from '@openmotoko/core'
import type { FastifyInstance } from 'fastify'

export default async function modelRoutes(fastify: FastifyInstance) {
	fastify.get('/api/models', async (_request, reply) => {
		const runtime = getAgentRuntime()
		const router = runtime.getRouter()
		const llmProviders = router.listProviders()

		const providers: Array<{
			id: string
			name: string
			models: Array<{
				id: string
				name: string
				contextWindow: number
				supportsTools: boolean
				costPer1kInput: number
				costPer1kOutput: number
			}>
		}> = []

		for (const provider of llmProviders) {
			try {
				const models = await provider.listModels()
				providers.push({
					id: provider.id,
					name: provider.name,
					models: models.map((m) => ({
						id: m.id,
						name: m.name,
						contextWindow: m.contextWindow,
						supportsTools: m.supportsTools,
						costPer1kInput: m.costPer1kInput,
						costPer1kOutput: m.costPer1kOutput,
					})),
				})
			} catch {}
		}

		return reply.send({ providers })
	})
}
