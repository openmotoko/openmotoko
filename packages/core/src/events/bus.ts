import { EventEmitter } from 'node:events'
import type { AgentEventByType, AgentEventType } from './types.js'

class AgentEventBus {
	private emitter = new EventEmitter()

	emit<T extends AgentEventType>(type: T, event: AgentEventByType<T>) {
		this.emitter.emit(type, event)
	}

	on<T extends AgentEventType>(type: T, handler: (event: AgentEventByType<T>) => void) {
		this.emitter.on(type, handler)
		return () => {
			this.emitter.off(type, handler)
		}
	}

	once<T extends AgentEventType>(type: T, handler: (event: AgentEventByType<T>) => void) {
		this.emitter.once(type, handler)
	}

	off<T extends AgentEventType>(type: T, handler: (event: AgentEventByType<T>) => void) {
		this.emitter.off(type, handler)
	}

	removeAllListeners(type?: AgentEventType) {
		this.emitter.removeAllListeners(type)
	}
}

export const eventBus = new AgentEventBus()
