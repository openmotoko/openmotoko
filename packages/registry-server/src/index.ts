import { createRegistryServer } from './server.js'

const port = Number(process.env.REGISTRY_PORT ?? 3458)
const host = process.env.REGISTRY_HOST ?? '0.0.0.0'

async function main() {
	const server = await createRegistryServer()
	await server.listen({ port, host })
	console.log(`Registry server listening on ${host}:${port}`)
}

main().catch((err) => {
	console.error('Failed to start registry server:', err)
	process.exit(1)
})
