import { describe, expect, it, vi } from 'vitest'
import { eventBus } from './bus.js'

describe('AgentEventBus', () => {
	it('emits and receives events', () => {
		const handler = vi.fn()
		const unsub = eventBus.on('message:received', handler)

		eventBus.emit('message:received', {
			type: 'message:received',
			conversationId: 'conv1',
			role: 'user',
			content: 'hello',
		})

		expect(handler).toHaveBeenCalledOnce()
		expect(handler).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'message:received',
				conversationId: 'conv1',
			}),
		)

		unsub()
	})

	it('returns unsubscribe function that works', () => {
		const handler = vi.fn()
		const unsub = eventBus.on('message:sent', handler)
		unsub()

		eventBus.emit('message:sent', {
			type: 'message:sent',
			conversationId: 'conv1',
			role: 'assistant',
			content: 'hi',
		})

		expect(handler).not.toHaveBeenCalled()
	})

	it('once handler fires only once', () => {
		const handler = vi.fn()
		eventBus.once('cost:updated', handler)

		const event = {
			type: 'cost:updated' as const,
			conversationId: 'c',
			provider: 'p',
			model: 'm',
			cost: 1,
		}

		eventBus.emit('cost:updated', event)
		eventBus.emit('cost:updated', event)

		expect(handler).toHaveBeenCalledOnce()
	})

	it('does not cross-fire between event types', () => {
		const handler = vi.fn()
		const unsub = eventBus.on('message:received', handler)

		eventBus.emit('message:sent', {
			type: 'message:sent',
			conversationId: 'c',
			role: 'assistant',
			content: 'x',
		})

		expect(handler).not.toHaveBeenCalled()
		unsub()
	})
})
