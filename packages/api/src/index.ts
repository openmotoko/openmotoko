import { getAgentRuntime, initAgentRuntime } from '@openmotoko/core'
import { createServer } from './server.js'

function validateEnv(): void {
	const password = process.env.OPENMOTOKO_PASSWORD
	if (!password) {
		console.error(
			'[SECURITY] OPENMOTOKO_PASSWORD is not set. The server cannot start without authentication configured.',
		)
		process.exit(1)
	}
	if (password.length < 8) {
		console.error('[SECURITY] OPENMOTOKO_PASSWORD must be at least 8 characters.')
		process.exit(1)
	}

	const hasLlmKey =
		process.env.ANTHROPIC_API_KEY ||
		process.env.OPENAI_API_KEY ||
		process.env.GOOGLE_AI_API_KEY ||
		process.env.OLLAMA_BASE_URL
	if (!hasLlmKey) {
		console.warn(
			'[WARN] No LLM API key configured. Set at least one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_AI_API_KEY, or OLLAMA_BASE_URL',
		)
	}

	if (process.env.NODE_ENV === 'production') {
		if (!process.env.OPENMOTOKO_CORS_ORIGIN) {
			console.warn(
				'[SECURITY] OPENMOTOKO_CORS_ORIGIN is not set in production. CORS will default to localhost.',
			)
		}
	}
}

const port = Number(process.env.OPENMOTOKO_PORT ?? 3457)
const host = process.env.OPENMOTOKO_HOST ?? '0.0.0.0'

async function main() {
	validateEnv()

	await initAgentRuntime()
	const server = await createServer()

	await server.listen({ port, host })
	server.log.info(`Agent runtime initialized, skills loaded`)

	const shutdown = async (signal: string) => {
		server.log.info(`Received ${signal}, shutting down`)
		const runtime = getAgentRuntime()
		await runtime.shutdown()
		await server.close()
		process.exit(0)
	}

	process.on('SIGINT', () => shutdown('SIGINT'))
	process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch((err) => {
	console.error('Failed to start server:', err)
	process.exit(1)
})
