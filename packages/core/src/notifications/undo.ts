type UndoFn = () => Promise<void>

interface UndoEntry {
	id: string
	description: string
	deadline: number
	execute: UndoFn
}

const UNDO_WINDOW_MS = 30_000

export class UndoManager {
	private entries = new Map<string, UndoEntry>()
	private cleanupTimer: ReturnType<typeof setInterval> | null = null

	start(): void {
		if (this.cleanupTimer) return
		this.cleanupTimer = setInterval(() => this.cleanup(), 5_000)
	}

	stop(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer)
			this.cleanupTimer = null
		}
		this.entries.clear()
	}

	register(id: string, description: string, undoFn: UndoFn, windowMs = UNDO_WINDOW_MS): void {
		this.entries.set(id, {
			id,
			description,
			deadline: Date.now() + windowMs,
			execute: undoFn,
		})
	}

	async undo(id: string): Promise<boolean> {
		const entry = this.entries.get(id)
		if (!entry) return false
		if (Date.now() > entry.deadline) {
			this.entries.delete(id)
			return false
		}

		try {
			await entry.execute()
			this.entries.delete(id)
			return true
		} catch {
			return false
		}
	}

	getAvailable(): { id: string; description: string; remainingMs: number }[] {
		const now = Date.now()
		const available: { id: string; description: string; remainingMs: number }[] = []

		for (const entry of this.entries.values()) {
			const remaining = entry.deadline - now
			if (remaining > 0) {
				available.push({
					id: entry.id,
					description: entry.description,
					remainingMs: remaining,
				})
			}
		}

		return available
	}

	private cleanup(): void {
		const now = Date.now()
		for (const [id, entry] of this.entries) {
			if (now > entry.deadline) {
				this.entries.delete(id)
			}
		}
	}
}

let instance: UndoManager | null = null

export function getUndoManager(): UndoManager {
	if (!instance) {
		instance = new UndoManager()
		instance.start()
	}
	return instance
}
