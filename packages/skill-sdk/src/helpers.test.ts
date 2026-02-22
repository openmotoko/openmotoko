import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { formatError, formatToolResult, parseJsonInput, validateInput } from './helpers.js'

describe('parseJsonInput', () => {
	it('parses valid input against schema', () => {
		const schema = z.object({ name: z.string() })
		const result = parseJsonInput({ name: 'Alice' }, schema)
		expect(result).toEqual({ name: 'Alice' })
	})

	it('throws on invalid input', () => {
		const schema = z.object({ name: z.string() })
		expect(() => parseJsonInput({ name: 42 }, schema)).toThrow()
	})

	it('strips extra fields', () => {
		const schema = z.object({ name: z.string() }).strict()
		expect(() => parseJsonInput({ name: 'Alice', extra: true }, schema)).toThrow()
	})
})

describe('formatToolResult', () => {
	it('wraps data in success result', () => {
		const result = formatToolResult({ count: 5 })
		expect(result.success).toBe(true)
		expect(result.data).toEqual({ count: 5 })
		expect(result.error).toBeUndefined()
	})

	it('handles null data', () => {
		const result = formatToolResult(null)
		expect(result.success).toBe(true)
		expect(result.data).toBeNull()
	})
})

describe('formatError', () => {
	it('formats Error instance', () => {
		const result = formatError(new Error('something broke'))
		expect(result.success).toBe(false)
		expect(result.error).toBe('something broke')
	})

	it('formats string error', () => {
		const result = formatError('raw error')
		expect(result.success).toBe(false)
		expect(result.error).toBe('raw error')
	})

	it('formats number error', () => {
		const result = formatError(404)
		expect(result.success).toBe(false)
		expect(result.error).toBe('404')
	})
})

describe('validateInput', () => {
	const schema = z.object({ age: z.number().min(0).max(150) })

	it('returns ok for valid input', () => {
		const result = validateInput(schema, { age: 25 })
		expect(result.ok).toBe(true)
		if (result.ok) expect(result.data).toEqual({ age: 25 })
	})

	it('returns error for invalid input', () => {
		const result = validateInput(schema, { age: -1 })
		expect(result.ok).toBe(false)
		if (!result.ok) expect(result.error).toBeTruthy()
	})

	it('returns error for wrong type', () => {
		const result = validateInput(schema, { age: 'old' })
		expect(result.ok).toBe(false)
	})
})
