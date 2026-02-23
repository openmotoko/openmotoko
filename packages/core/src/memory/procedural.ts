import { desc, eq } from 'drizzle-orm'
import { getDb } from '../db/client.js'
import type { ProceduralMemoryRow } from './schema.js'
import { proceduralMemory } from './schema.js'

interface ProcedureEntry {
	name: string
	description: string
	steps: string[]
	trigger?: string
}

export class ProceduralMemoryStore {
	async store(entry: ProcedureEntry): Promise<string> {
		const db = getDb()

		const [row] = db
			.insert(proceduralMemory)
			.values({
				name: entry.name,
				description: entry.description,
				steps: JSON.stringify(entry.steps),
				trigger: entry.trigger,
			})
			.returning()
			.all()

		return row.id
	}

	async update(id: string, entry: Partial<ProcedureEntry>): Promise<void> {
		const db = getDb()
		const updates: Record<string, unknown> = {}
		if (entry.name) updates.name = entry.name
		if (entry.description) updates.description = entry.description
		if (entry.steps) updates.steps = JSON.stringify(entry.steps)
		if (entry.trigger !== undefined) updates.trigger = entry.trigger

		db.update(proceduralMemory).set(updates).where(eq(proceduralMemory.id, id)).run()
	}

	async recordUsage(id: string): Promise<void> {
		const db = getDb()
		const [row] = db.select().from(proceduralMemory).where(eq(proceduralMemory.id, id)).all()

		if (row) {
			db.update(proceduralMemory)
				.set({ usageCount: row.usageCount + 1, lastUsedAt: Date.now() })
				.where(eq(proceduralMemory.id, id))
				.run()
		}
	}

	async findByTrigger(trigger: string): Promise<ProceduralMemoryRow[]> {
		const db = getDb()
		return db.select().from(proceduralMemory).where(eq(proceduralMemory.trigger, trigger)).all()
	}

	async getMostUsed(limit = 10): Promise<ProceduralMemoryRow[]> {
		const db = getDb()
		return db
			.select()
			.from(proceduralMemory)
			.orderBy(desc(proceduralMemory.usageCount))
			.limit(limit)
			.all()
	}

	async getAll(): Promise<ProceduralMemoryRow[]> {
		const db = getDb()
		return db.select().from(proceduralMemory).all()
	}

	async remove(id: string): Promise<void> {
		const db = getDb()
		db.delete(proceduralMemory).where(eq(proceduralMemory.id, id)).run()
	}

	parseSteps(row: ProceduralMemoryRow): string[] {
		try {
			return JSON.parse(row.steps) as string[]
		} catch {
			return []
		}
	}
}
