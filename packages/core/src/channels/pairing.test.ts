import { beforeEach, describe, expect, it } from 'vitest'
import { PairingManager } from './pairing.js'

describe('PairingManager', () => {
	let pm: PairingManager

	beforeEach(() => {
		pm = new PairingManager()
	})

	describe('generatePairingCode', () => {
		it('generates a 6-character code', () => {
			const code = pm.generatePairingCode()
			expect(code).toHaveLength(6)
		})

		it('uses only allowed characters', () => {
			const allowed = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
			for (let i = 0; i < 100; i++) {
				const code = pm.generatePairingCode()
				for (const ch of code) {
					expect(allowed).toContain(ch)
				}
			}
		})

		it('generates unique codes', () => {
			const codes = new Set<string>()
			for (let i = 0; i < 50; i++) {
				codes.add(pm.generatePairingCode())
			}
			expect(codes.size).toBeGreaterThan(40)
		})
	})

	describe('createRequest', () => {
		it('creates a pairing request', () => {
			const req = pm.createRequest('ch1', 'telegram', 'sender1', 'Alice')
			expect(req.channelId).toBe('ch1')
			expect(req.channelType).toBe('telegram')
			expect(req.senderId).toBe('sender1')
			expect(req.senderName).toBe('Alice')
			expect(req.approved).toBe(false)
			expect(req.code).toHaveLength(6)
			expect(req.expiresAt).toBeGreaterThan(Date.now())
		})

		it('returns existing pending request for same sender', () => {
			const req1 = pm.createRequest('ch1', 'telegram', 'sender1', 'Alice')
			const req2 = pm.createRequest('ch1', 'telegram', 'sender1', 'Alice')
			expect(req1.id).toBe(req2.id)
		})

		it('creates separate requests for different senders', () => {
			const req1 = pm.createRequest('ch1', 'telegram', 'sender1', 'Alice')
			const req2 = pm.createRequest('ch1', 'telegram', 'sender2', 'Bob')
			expect(req1.id).not.toBe(req2.id)
		})
	})

	describe('approveByCode', () => {
		it('approves a valid pending request', () => {
			const req = pm.createRequest('ch1', 'telegram', 'sender1', 'Alice')
			const approved = pm.approveByCode(req.code)
			expect(approved).not.toBeNull()
			expect(approved?.approved).toBe(true)
		})

		it('returns null for invalid code', () => {
			expect(pm.approveByCode('ZZZZZZ')).toBeNull()
		})

		it('returns null for already approved request', () => {
			const req = pm.createRequest('ch1', 'telegram', 'sender1', 'Alice')
			pm.approveByCode(req.code)
			expect(pm.approveByCode(req.code)).toBeNull()
		})

		it('marks sender as approved after code approval', () => {
			const req = pm.createRequest('ch1', 'telegram', 'sender1', 'Alice')
			pm.approveByCode(req.code)
			expect(pm.isSenderApproved('telegram', 'sender1')).toBe(true)
		})
	})

	describe('approveById', () => {
		it('approves by request ID', () => {
			const req = pm.createRequest('ch1', 'telegram', 'sender1', 'Alice')
			const approved = pm.approveById(req.id)
			expect(approved).not.toBeNull()
			expect(approved?.approved).toBe(true)
		})

		it('returns null for unknown ID', () => {
			expect(pm.approveById('nonexistent')).toBeNull()
		})
	})

	describe('denyById', () => {
		it('removes the request', () => {
			const req = pm.createRequest('ch1', 'telegram', 'sender1', 'Alice')
			expect(pm.denyById(req.id)).toBe(true)
			expect(pm.getPendingRequests()).toHaveLength(0)
		})
	})

	describe('getPendingRequests', () => {
		it('returns only unapproved, non-expired requests', () => {
			pm.createRequest('ch1', 'telegram', 'sender1', 'Alice')
			pm.createRequest('ch1', 'telegram', 'sender2', 'Bob')
			const req3 = pm.createRequest('ch1', 'telegram', 'sender3', 'Carol')
			pm.approveByCode(req3.code)

			const pending = pm.getPendingRequests()
			expect(pending).toHaveLength(2)
		})
	})

	describe('isSenderApproved', () => {
		it('returns false for unknown sender', () => {
			expect(pm.isSenderApproved('telegram', 'unknown')).toBe(false)
		})
	})

	describe('cleanup', () => {
		it('does not crash on empty state', () => {
			expect(() => pm.cleanup()).not.toThrow()
		})
	})
})
