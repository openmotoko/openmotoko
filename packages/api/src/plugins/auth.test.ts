import { describe, expect, it, beforeEach } from 'vitest'
import { createSession, destroySession, getSession, pruneExpiredSessions } from './auth.js'

describe('Session Management', () => {
	describe('createSession', () => {
		it('returns a 64-char hex token', () => {
			const token = createSession('user1')
			expect(token).toHaveLength(64)
			expect(token).toMatch(/^[0-9a-f]{64}$/)
		})

		it('creates unique tokens', () => {
			const t1 = createSession('user1')
			const t2 = createSession('user1')
			expect(t1).not.toBe(t2)
		})
	})

	describe('getSession', () => {
		it('retrieves a valid session', () => {
			const token = createSession('owner')
			const session = getSession(token)
			expect(session).toBeDefined()
			expect(session!.userId).toBe('owner')
			expect(session!.createdAt).toBeLessThanOrEqual(Date.now())
			destroySession(token)
		})

		it('returns undefined for unknown token', () => {
			expect(getSession('nonexistent')).toBeUndefined()
		})

		it('returns undefined for empty string', () => {
			expect(getSession('')).toBeUndefined()
		})
	})

	describe('destroySession', () => {
		it('removes a session', () => {
			const token = createSession('owner')
			expect(destroySession(token)).toBe(true)
			expect(getSession(token)).toBeUndefined()
		})

		it('returns false for unknown token', () => {
			expect(destroySession('fake')).toBe(false)
		})
	})

	describe('pruneExpiredSessions', () => {
		it('does not crash on empty state', () => {
			expect(() => pruneExpiredSessions()).not.toThrow()
		})

		it('does not remove fresh sessions', () => {
			const token = createSession('owner')
			pruneExpiredSessions()
			expect(getSession(token)).toBeDefined()
			destroySession(token)
		})
	})
})
