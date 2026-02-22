import { nanoid } from 'nanoid'
import type { ChannelType, PairingRequest } from './types.js'

const PAIRING_CODE_LENGTH = 6
const PAIRING_TTL_MS = 15 * 60 * 1000

export class PairingManager {
	private requests = new Map<string, PairingRequest>()
	private approvedSenders = new Set<string>()

	generatePairingCode(): string {
		const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
		let code = ''
		for (let i = 0; i < PAIRING_CODE_LENGTH; i++) {
			code += chars[Math.floor(Math.random() * chars.length)]
		}
		return code
	}

	createRequest(
		channelId: string,
		channelType: ChannelType,
		senderId: string,
		senderName: string,
	): PairingRequest {
		const senderKey = `${channelType}:${senderId}`
		for (const [_id, req] of this.requests) {
			if (`${req.channelType}:${req.senderId}` === senderKey && !req.approved) {
				return req
			}
		}

		const now = Date.now()
		const request: PairingRequest = {
			id: nanoid(),
			channelId,
			channelType,
			senderId,
			senderName,
			code: this.generatePairingCode(),
			createdAt: now,
			expiresAt: now + PAIRING_TTL_MS,
			approved: false,
		}

		this.requests.set(request.id, request)
		return request
	}

	approveByCode(code: string): PairingRequest | null {
		const now = Date.now()
		for (const [, req] of this.requests) {
			if (req.code === code && !req.approved && req.expiresAt > now) {
				req.approved = true
				this.approvedSenders.add(`${req.channelType}:${req.senderId}`)
				return req
			}
		}
		return null
	}

	approveById(requestId: string): PairingRequest | null {
		const req = this.requests.get(requestId)
		if (!req) return null
		req.approved = true
		this.approvedSenders.add(`${req.channelType}:${req.senderId}`)
		return req
	}

	denyById(requestId: string): boolean {
		return this.requests.delete(requestId)
	}

	isSenderApproved(channelType: ChannelType, senderId: string): boolean {
		return this.approvedSenders.has(`${channelType}:${senderId}`)
	}

	getPendingRequests(): PairingRequest[] {
		const now = Date.now()
		const pending: PairingRequest[] = []
		for (const [id, req] of this.requests) {
			if (req.expiresAt < now) {
				this.requests.delete(id)
				continue
			}
			if (!req.approved) {
				pending.push(req)
			}
		}
		return pending
	}

	cleanup(): void {
		const now = Date.now()
		for (const [id, req] of this.requests) {
			if (req.expiresAt < now) {
				this.requests.delete(id)
			}
		}
	}
}
