export type AgentEvent =
	| { type: 'message:received'; conversationId: string; message: import('./api').Message }
	| { type: 'message:sent'; conversationId: string; message: import('./api').Message }
	| { type: 'tool:called'; conversationId: string; tool: string; input: unknown }
	| {
			type: 'tool:result'
			conversationId: string
			tool: string
			output: unknown
			duration: number
			status: 'success' | 'error'
	  }
	| { type: 'llm:stream'; conversationId: string; chunk: string }
	| { type: 'llm:complete'; conversationId: string }
	| { type: 'cost:updated'; totalToday: number; lastRequest: number }
	| { type: 'skill:activated'; skillId: string }
	| { type: 'channel:message'; channel: string; from: string; content: string }

type EventCallback = (event: AgentEvent) => void

const MAX_RECONNECT_DELAY = 30000
const BASE_RECONNECT_DELAY = 1000

class WebSocketClient {
	private ws: WebSocket | null = null
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null
	private reconnectAttempts = 0
	private shouldReconnect = true
	private callbacks: Set<EventCallback> = new Set()
	private _isConnected = false

	get isConnected(): boolean {
		return this._isConnected
	}

	onEvent(callback: EventCallback): () => void {
		this.callbacks.add(callback)
		return () => this.callbacks.delete(callback)
	}

	connect(): void {
		this.shouldReconnect = true
		this.createConnection()
	}

	disconnect(): void {
		this.shouldReconnect = false
		this.clearReconnectTimer()
		if (this.ws) {
			this.ws.close(1000, 'Client disconnect')
			this.ws = null
		}
		this._isConnected = false
	}

	private createConnection(): void {
		if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING)
			return

		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
		const url = `${protocol}//${window.location.host}/ws`

		this.ws = new WebSocket(url)

		this.ws.onopen = () => {
			this._isConnected = true
			this.reconnectAttempts = 0
		}

		this.ws.onmessage = (event) => {
			try {
				const data: AgentEvent = JSON.parse(event.data)
				for (const cb of this.callbacks) {
					cb(data)
				}
			} catch {
				// noop
			}
		}

		this.ws.onclose = (event) => {
			this._isConnected = false
			this.ws = null
			if (event.code === 4001) {
				this.reconnectAttempts = Math.max(this.reconnectAttempts, 5)
			}
			if (this.shouldReconnect) {
				this.scheduleReconnect()
			}
		}

		this.ws.onerror = () => {
			this.ws?.close()
		}
	}

	private scheduleReconnect(): void {
		this.clearReconnectTimer()
		const delay = Math.min(BASE_RECONNECT_DELAY * 2 ** this.reconnectAttempts, MAX_RECONNECT_DELAY)
		this.reconnectAttempts++
		this.reconnectTimer = setTimeout(() => this.createConnection(), delay)
	}

	private clearReconnectTimer(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = null
		}
	}
}

export const wsClient = new WebSocketClient()
