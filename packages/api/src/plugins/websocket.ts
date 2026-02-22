import websocketPlugin from '@fastify/websocket'
import type { AgentEvent, AgentEventType } from '@openmotoko/core'
import { eventBus } from '@openmotoko/core'
import type { FastifyInstance } from 'fastify'
import type { WebSocket } from 'ws'

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
]

export default async function registerWebSocket(fastify: FastifyInstance) {
	await fastify.register(websocketPlugin)

	for (const eventType of ALL_EVENT_TYPES) {
		eventBus.on(eventType, (event) => {
			broadcast(event as AgentEvent)
		})
	}

	fastify.get('/ws', { websocket: true }, (socket) => {
		clients.add(socket as unknown as WebSocket)

		socket.on('close', () => {
			clients.delete(socket as unknown as WebSocket)
		})

		socket.on('error', () => {
			clients.delete(socket as unknown as WebSocket)
		})
	})
}
