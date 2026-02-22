import { describe, expect, it } from 'vitest'
import { getNextRun, isValidCron, parseCron } from './cron.js'

describe('parseCron', () => {
	it('parses "* * * * *" as every minute', () => {
		const fields = parseCron('* * * * *')
		expect(fields.minute).toHaveLength(60)
		expect(fields.hour).toHaveLength(24)
		expect(fields.dayOfMonth).toHaveLength(31)
		expect(fields.month).toHaveLength(12)
		expect(fields.dayOfWeek).toHaveLength(7)
	})

	it('parses specific values', () => {
		const fields = parseCron('30 9 * * 1')
		expect(fields.minute).toEqual([30])
		expect(fields.hour).toEqual([9])
		expect(fields.dayOfWeek).toEqual([1])
	})

	it('parses ranges', () => {
		const fields = parseCron('0-5 * * * *')
		expect(fields.minute).toEqual([0, 1, 2, 3, 4, 5])
	})

	it('parses step values', () => {
		const fields = parseCron('*/15 * * * *')
		expect(fields.minute).toEqual([0, 15, 30, 45])
	})

	it('parses comma-separated values', () => {
		const fields = parseCron('0,30 * * * *')
		expect(fields.minute).toEqual([0, 30])
	})

	it('parses complex expression', () => {
		const fields = parseCron('0 9-17 * 1-6 1-5')
		expect(fields.minute).toEqual([0])
		expect(fields.hour).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17])
		expect(fields.month).toEqual([1, 2, 3, 4, 5, 6])
		expect(fields.dayOfWeek).toEqual([1, 2, 3, 4, 5])
	})

	it('throws on invalid expression with wrong field count', () => {
		expect(() => parseCron('* * *')).toThrow('expected 5 fields')
		expect(() => parseCron('* * * * * *')).toThrow('expected 5 fields')
	})
})

describe('getNextRun', () => {
	it('returns a future date', () => {
		const next = getNextRun('* * * * *')
		expect(next.getTime()).toBeGreaterThan(Date.now())
	})

	it('respects specific minute', () => {
		const after = new Date(2026, 0, 1, 12, 0, 0)
		const next = getNextRun('30 * * * *', after)
		expect(next.getMinutes()).toBe(30)
	})

	it('respects specific hour', () => {
		const after = new Date(2026, 0, 1, 0, 0, 0)
		const next = getNextRun('0 9 * * *', after)
		expect(next.getHours()).toBe(9)
		expect(next.getMinutes()).toBe(0)
	})

	it('advances to next day if time passed', () => {
		const after = new Date(2026, 0, 1, 18, 0, 0)
		const next = getNextRun('0 9 * * *', after)
		expect(next.getDate()).toBe(2)
		expect(next.getHours()).toBe(9)
	})

	it('handles day-of-week constraint', () => {
		const monday = new Date(2026, 1, 16, 0, 0, 0) // Feb 16, 2026 = Monday
		const next = getNextRun('0 9 * * 3', monday) // Wednesday
		expect(next.getDay()).toBe(3)
	})
})

describe('isValidCron', () => {
	it('returns true for valid expressions', () => {
		expect(isValidCron('* * * * *')).toBe(true)
		expect(isValidCron('0 9 * * 1-5')).toBe(true)
		expect(isValidCron('*/5 * * * *')).toBe(true)
	})

	it('returns false for invalid expressions', () => {
		expect(isValidCron('bad')).toBe(false)
		expect(isValidCron('* *')).toBe(false)
		expect(isValidCron('')).toBe(false)
	})
})
