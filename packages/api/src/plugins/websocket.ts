import websocketPlugin from '@fastify/websocket'
import type { AgentEvent, AgentEventType } from '@openmotoko/core'
import { eventBus } from '@openmotoko/core'
import type { FastifyInstance } from 'fastify'
import type { WebSocket } from 'ws'
import { getSession } from './auth.js'

const clients = new Set<WebSocket>()

export function broadcast(event: AgentEvent) {
	const data = JSON.stringify(event)
	for (const client of clients) {
		if (client.readyState === client.OPEN) {
			client.send(data)
		}
	}
}

const ALL_EVENT_TYPES: AgentEventType[] = [
	'message:received',
	'message:sent',
	'tool:called',
	'tool:result',
	'llm:stream',
	'llm:complete',
	'cost:updated',
	'skill:activated',
	'channel:message',
	'scheduler:started',
	'scheduler:completed',
	'scheduler:failed',
	'artifact:created',
	'artifact:updated',
	'agent:spawned',
	'agent:completed',
	'agent:failed',
]

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
	if (!cookieHeader) return {}
	const result: Record<string, string> = {}
	for (const pair of cookieHeader.split(';')) {
		const [key, ...rest] = pair.trim().split('=')
		if (key) result[key.trim()] = rest.join('=').trim()
	}
	return result
}

export default async function registerWebSocket(fastify: FastifyInstance) {
	await fastify.register(websocketPlugin)

	for (const eventType of ALL_EVENT_TYPES) {
		eventBus.on(eventType, (event) => {
			broadcast(event as AgentEvent)
		})
	}

	fastify.get('/ws', { websocket: true }, (socket, request) => {
		const cookies = parseCookies(request.headers.cookie)
		const token = cookies.session ?? (request.query as Record<string, string>).token

		if (!token || !getSession(token)) {
			socket.close(4001, 'Unauthorized')
			return
		}

		clients.add(socket as unknown as WebSocket)

		const pingInterval = setInterval(() => {
			if (socket.readyState === socket.OPEN) {
				socket.ping()
			} else {
				clearInterval(pingInterval)
				clients.delete(socket as unknown as WebSocket)
			}
		}, 30000)

		socket.on('close', () => {
			clearInterval(pingInterval)
			clients.delete(socket as unknown as WebSocket)
		})

		socket.on('error', () => {
			clearInterval(pingInterval)
			clients.delete(socket as unknown as WebSocket)
		})
	})
}
