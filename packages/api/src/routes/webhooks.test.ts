import { timingSafeEqual } from 'node:crypto'
import { describe, expect, it } from 'vitest'

function safeCompareSecrets(a: string, b: string): boolean {
	const bufA = Buffer.from(a, 'utf-8')
	const bufB = Buffer.from(b, 'utf-8')
	if (bufA.length !== bufB.length) {
		timingSafeEqual(bufA, bufA)
		return false
	}
	return timingSafeEqual(bufA, bufB)
}

describe('Webhook Secret Comparison', () => {
	it('returns true for matching secrets', () => {
		expect(safeCompareSecrets('my-secret-123', 'my-secret-123')).toBe(true)
	})

	it('returns false for non-matching secrets same length', () => {
		expect(safeCompareSecrets('my-secret-123', 'my-secret-456')).toBe(false)
	})

	it('returns false for different lengths', () => {
		expect(safeCompareSecrets('short', 'this is much longer')).toBe(false)
	})

	it('returns false for empty vs non-empty', () => {
		expect(safeCompareSecrets('', 'secret')).toBe(false)
	})

	it('returns true for both empty', () => {
		expect(safeCompareSecrets('', '')).toBe(true)
	})

	it('handles unicode strings', () => {
		expect(safeCompareSecrets('passwort-aeoeu', 'passwort-aeoeu')).toBe(true)
		expect(safeCompareSecrets('passwort-aeoeu', 'passwort-aoeue')).toBe(false)
	})
})

describe('Gmail Webhook Validation Schema', async () => {
	const { z } = await import('zod')

	const gmailPushSchema = z.object({
		message: z.object({
			data: z.string().min(1),
			messageId: z.string().optional(),
			publishTime: z.string().optional(),
		}),
		subscription: z.string().min(1),
	})

	it('validates correct Pub/Sub payload', () => {
		const result = gmailPushSchema.safeParse({
			message: { data: 'base64encodeddata', messageId: '123' },
			subscription: 'projects/my-project/subscriptions/my-sub',
		})
		expect(result.success).toBe(true)
	})

	it('rejects empty data', () => {
		const result = gmailPushSchema.safeParse({
			message: { data: '' },
			subscription: 'sub',
		})
		expect(result.success).toBe(false)
	})

	it('rejects missing message', () => {
		const result = gmailPushSchema.safeParse({
			subscription: 'sub',
		})
		expect(result.success).toBe(false)
	})

	it('rejects missing subscription', () => {
		const result = gmailPushSchema.safeParse({
			message: { data: 'test' },
		})
		expect(result.success).toBe(false)
	})

	it('rejects completely empty object', () => {
		expect(gmailPushSchema.safeParse({}).success).toBe(false)
	})
})
