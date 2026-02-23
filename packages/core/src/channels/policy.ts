import { and, eq } from 'drizzle-orm'
import { getConfig } from '../config/index.js'
import type { ChannelPolicy } from '../config/schema.js'
import { getDb } from '../db/client.js'
import { channelAllowlist } from '../db/schema.js'
import { PairingManager } from './pairing.js'
import type { ChannelType, InboundMessage } from './types.js'

export interface PolicyResult {
	allowed: boolean
	reason?: string
	pairingChallenge?: string
}

const pairingManager = new PairingManager()

export function getPairingManager(): PairingManager {
	return pairingManager
}

function getPolicyForChannel(channelType: string): ChannelPolicy {
	const config = getConfig()
	const channelConf = config.channels[channelType]
	if (channelConf?.policy) return channelConf.policy
	return { dmPolicy: 'pairing', allowFrom: [], requireMention: false }
}

export async function enforcePolicy(
	channelType: ChannelType | string,
	msg: InboundMessage,
): Promise<PolicyResult> {
	const policy = getPolicyForChannel(channelType)

	if (msg.isGroup) {
		if (policy.requireMention && !msg.isMention) {
			return { allowed: false, reason: 'mention_required' }
		}
		return { allowed: true }
	}

	if (policy.dmPolicy === 'open') {
		return { allowed: true }
	}

	if (policy.allowFrom.length > 0 && policy.allowFrom.includes(msg.senderId)) {
		return { allowed: true }
	}

	const db = getDb()
	const [entry] = db
		.select()
		.from(channelAllowlist)
		.where(
			and(
				eq(channelAllowlist.channelType, channelType),
				eq(channelAllowlist.senderId, msg.senderId),
			),
		)
		.all()

	if (entry) {
		return { allowed: true }
	}

	if (pairingManager.isSenderApproved(channelType as ChannelType, msg.senderId)) {
		db.insert(channelAllowlist)
			.values({
				channelType,
				senderId: msg.senderId,
				senderName: msg.senderName ?? null,
			})
			.run()
		return { allowed: true }
	}

	if (policy.dmPolicy === 'allowlist') {
		return { allowed: false, reason: 'not_in_allowlist' }
	}

	const trimmed = msg.content.trim()
	const approved = pairingManager.approveByCode(trimmed)
	if (approved) {
		db.insert(channelAllowlist)
			.values({
				channelType,
				senderId: msg.senderId,
				senderName: msg.senderName ?? null,
			})
			.run()
		return { allowed: true }
	}

	const request = pairingManager.createRequest(
		msg.channelId,
		channelType as ChannelType,
		msg.senderId,
		msg.senderName,
	)

	return {
		allowed: false,
		reason: 'pairing_required',
		pairingChallenge: request.code,
	}
}

export async function approveSender(
	channelType: string,
	senderId: string,
	senderName?: string,
): Promise<void> {
	const db = getDb()
	const [existing] = db
		.select()
		.from(channelAllowlist)
		.where(
			and(eq(channelAllowlist.channelType, channelType), eq(channelAllowlist.senderId, senderId)),
		)
		.all()

	if (existing) return

	db.insert(channelAllowlist)
		.values({ channelType, senderId, senderName: senderName ?? null })
		.run()
}

export async function revokeSender(channelType: string, senderId: string): Promise<boolean> {
	const db = getDb()
	const result = db
		.delete(channelAllowlist)
		.where(
			and(eq(channelAllowlist.channelType, channelType), eq(channelAllowlist.senderId, senderId)),
		)
		.run()
	return result.changes > 0
}

export async function listAllowed(channelType?: string) {
	const db = getDb()
	if (channelType) {
		return db
			.select()
			.from(channelAllowlist)
			.where(eq(channelAllowlist.channelType, channelType))
			.all()
	}
	return db.select().from(channelAllowlist).all()
}
