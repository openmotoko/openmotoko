import { createHmac } from 'node:crypto'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '../db/client.js'
import type { ApprovalType } from '../intents/types.js'
import type { ActionLogRow } from './schema.js'
import { actionLog } from './schema.js'

const HMAC_SECRET = process.env.OPENMOTOKO_HMAC_SECRET ?? 'openmotoko-default-hmac-key'

interface LogEntry {
	intentId?: string
	action: string
	parameters: Record<string, unknown>
	result: 'success' | 'failure' | 'partial'
	approval: ApprovalType
	approvedAt?: number
	tokenCost?: number
	executionDuration?: number
	undoAvailable?: boolean
	undoDeadline?: number
}

function computeHmac(data: string): string {
	return createHmac('sha256', HMAC_SECRET).update(data).digest('hex')
}

export class ActionLogger {
	async log(entry: LogEntry): Promise<string> {
		const db = getDb()
		const paramsStr = JSON.stringify(entry.parameters)
		const payload = `${entry.action}:${paramsStr}:${entry.result}:${Date.now()}`
		const hmac = computeHmac(payload)

		const [row] = db
			.insert(actionLog)
			.values({
				intentId: entry.intentId,
				action: entry.action,
				parameters: paramsStr,
				result: entry.result,
				approval: entry.approval,
				approvedAt: entry.approvedAt,
				tokenCost: entry.tokenCost ?? 0,
				executionDuration: entry.executionDuration ?? 0,
				undoAvailable: entry.undoAvailable ? 1 : 0,
				undoDeadline: entry.undoDeadline,
				hmac,
			})
			.returning()
			.all()

		return row.id
	}

	async getRecent(limit = 100): Promise<ActionLogRow[]> {
		const db = getDb()
		return db.select().from(actionLog).orderBy(desc(actionLog.createdAt)).limit(limit).all()
	}

	async getByIntent(intentId: string): Promise<ActionLogRow[]> {
		const db = getDb()
		return db
			.select()
			.from(actionLog)
			.where(eq(actionLog.intentId, intentId))
			.orderBy(desc(actionLog.createdAt))
			.all()
	}

	async verify(entry: ActionLogRow): Promise<boolean> {
		const payload = `${entry.action}:${entry.parameters}:${entry.result}:${entry.createdAt}`
		const expected = computeHmac(payload)
		return expected === entry.hmac
	}

	async verifyAll(): Promise<{ total: number; valid: number; tampered: number }> {
		const db = getDb()
		const all = db.select().from(actionLog).all()
		let valid = 0
		let tampered = 0

		for (const entry of all) {
			if (await this.verify(entry)) {
				valid++
			} else {
				tampered++
			}
		}

		return { total: all.length, valid, tampered }
	}

	async getUndoable(): Promise<ActionLogRow[]> {
		const db = getDb()
		const now = Date.now()
		return db
			.select()
			.from(actionLog)
			.where(eq(actionLog.undoAvailable, 1))
			.all()
			.filter((row) => row.undoDeadline != null && row.undoDeadline > now)
	}
}

let instance: ActionLogger | null = null

export function getActionLogger(): ActionLogger {
	if (!instance) {
		instance = new ActionLogger()
	}
	return instance
}
