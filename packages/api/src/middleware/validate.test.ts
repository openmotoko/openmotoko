import { describe, expect, it, vi } from 'vitest'
import { validate } from './validate.js'
import { z } from 'zod'

function createMockRequest(overrides: Record<string, unknown> = {}) {
	return {
		body: undefined,
		params: {},
		query: {},
		...overrides,
	} as any
}

function createMockReply() {
	const reply: any = {
		statusCode: 200,
		sent: null,
		status(code: number) {
			reply.statusCode = code
			return reply
		},
		send(data: unknown) {
			reply.sent = data
			return reply
		},
	}
	return reply
}

describe('validate middleware', () => {
	describe('body validation', () => {
		const schema = { body: z.object({ name: z.string().min(1) }) }

		it('passes valid body', async () => {
			const req = createMockRequest({ body: { name: 'Alice' } })
			const reply = createMockReply()
			await validate(schema)(req, reply)
			expect(reply.sent).toBeNull()
			expect(req.body).toEqual({ name: 'Alice' })
		})

		it('rejects invalid body', async () => {
			const req = createMockRequest({ body: { name: '' } })
			const reply = createMockReply()
			await validate(schema)(req, reply)
			expect(reply.statusCode).toBe(400)
			expect(reply.sent.code).toBe('VALIDATION_ERROR')
			expect(reply.sent.details).toHaveLength(1)
			expect(reply.sent.details[0].field).toBe('body')
		})

		it('rejects missing body field', async () => {
			const req = createMockRequest({ body: {} })
			const reply = createMockReply()
			await validate(schema)(req, reply)
			expect(reply.statusCode).toBe(400)
		})
	})

	describe('params validation', () => {
		const schema = { params: z.object({ id: z.string().min(1) }) }

		it('passes valid params', async () => {
			const req = createMockRequest({ params: { id: 'abc123' } })
			const reply = createMockReply()
			await validate(schema)(req, reply)
			expect(reply.sent).toBeNull()
		})

		it('rejects invalid params', async () => {
			const req = createMockRequest({ params: { id: '' } })
			const reply = createMockReply()
			await validate(schema)(req, reply)
			expect(reply.statusCode).toBe(400)
			expect(reply.sent.details[0].field).toBe('params')
		})
	})

	describe('query validation', () => {
		const schema = { query: z.object({ page: z.coerce.number().min(1) }) }

		it('passes valid query', async () => {
			const req = createMockRequest({ query: { page: '5' } })
			const reply = createMockReply()
			await validate(schema)(req, reply)
			expect(reply.sent).toBeNull()
		})

		it('rejects invalid query', async () => {
			const req = createMockRequest({ query: { page: '0' } })
			const reply = createMockReply()
			await validate(schema)(req, reply)
			expect(reply.statusCode).toBe(400)
		})
	})

	describe('combined validation', () => {
		it('collects errors from all fields', async () => {
			const schema = {
				body: z.object({ x: z.number() }),
				params: z.object({ id: z.string().min(1) }),
			}
			const req = createMockRequest({ body: { x: 'not-number' }, params: { id: '' } })
			const reply = createMockReply()
			await validate(schema)(req, reply)
			expect(reply.statusCode).toBe(400)
			expect(reply.sent.details.length).toBeGreaterThanOrEqual(2)
		})
	})
})
