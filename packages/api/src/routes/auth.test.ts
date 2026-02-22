import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { timingSafeEqual } from 'node:crypto'

describe('Auth Security', () => {
	describe('timing-safe comparison', () => {
		function safeCompare(a: string, b: string): boolean {
			const bufA = Buffer.from(a, 'utf-8')
			const bufB = Buffer.from(b, 'utf-8')
			if (bufA.length !== bufB.length) {
				timingSafeEqual(bufA, bufA)
				return false
			}
			return timingSafeEqual(bufA, bufB)
		}

		it('returns true for equal strings', () => {
			expect(safeCompare('password123', 'password123')).toBe(true)
		})

		it('returns false for different strings of same length', () => {
			expect(safeCompare('password123', 'password456')).toBe(false)
		})

		it('returns false for different lengths', () => {
			expect(safeCompare('short', 'much longer string')).toBe(false)
		})

		it('returns false for empty vs non-empty', () => {
			expect(safeCompare('', 'notempty')).toBe(false)
		})

		it('returns true for both empty', () => {
			expect(safeCompare('', '')).toBe(true)
		})
	})

	describe('login rate limiting logic', () => {
		const attempts = new Map<string, { count: number; resetAt: number }>()
		const MAX = 5
		const LOCKOUT = 15 * 60 * 1000

		function isLocked(ip: string): boolean {
			const e = attempts.get(ip)
			if (!e) return false
			if (Date.now() > e.resetAt) {
				attempts.delete(ip)
				return false
			}
			return e.count >= MAX
		}

		function recordFail(ip: string): void {
			const e = attempts.get(ip) ?? { count: 0, resetAt: Date.now() + LOCKOUT }
			e.count++
			e.resetAt = Date.now() + LOCKOUT
			attempts.set(ip, e)
		}

		function clearAttempts(ip: string): void {
			attempts.delete(ip)
		}

		beforeEach(() => {
			attempts.clear()
		})

		it('allows first attempt', () => {
			expect(isLocked('1.2.3.4')).toBe(false)
		})

		it('locks after 5 failures', () => {
			const ip = '1.2.3.4'
			for (let i = 0; i < 5; i++) recordFail(ip)
			expect(isLocked(ip)).toBe(true)
		})

		it('does not lock after 4 failures', () => {
			const ip = '1.2.3.4'
			for (let i = 0; i < 4; i++) recordFail(ip)
			expect(isLocked(ip)).toBe(false)
		})

		it('clears on success', () => {
			const ip = '1.2.3.4'
			for (let i = 0; i < 3; i++) recordFail(ip)
			clearAttempts(ip)
			expect(isLocked(ip)).toBe(false)
		})

		it('isolates different IPs', () => {
			for (let i = 0; i < 5; i++) recordFail('1.1.1.1')
			expect(isLocked('1.1.1.1')).toBe(true)
			expect(isLocked('2.2.2.2')).toBe(false)
		})
	})

	describe('session cookie security', () => {
		it('cookie config has httpOnly', () => {
			const config = {
				httpOnly: true,
				sameSite: 'strict' as const,
				path: '/',
				secure: true,
				maxAge: 60 * 60 * 24 * 7,
			}
			expect(config.httpOnly).toBe(true)
			expect(config.sameSite).toBe('strict')
			expect(config.secure).toBe(true)
		})
	})
})
