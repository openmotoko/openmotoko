import { createServer } from './server.js'

const port = Number(process.env.OPENMOTOKO_PORT ?? 3457)
const host = process.env.OPENMOTOKO_HOST ?? '0.0.0.0'

async function main() {
	const server = await createServer()

	await server.listen({ port, host })

	const shutdown = async (signal: string) => {
		server.log.info(`Received ${signal}, shutting down`)
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
