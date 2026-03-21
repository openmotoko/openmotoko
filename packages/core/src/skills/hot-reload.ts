import { readFile, watch } from 'node:fs/promises'
import { basename, join } from 'node:path'

export class SkillHotReloader {
	private abortControllers: Map<string, AbortController> = new Map()
	private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()
	private readonly debounceMs = 500

	onReload: (skillId: string) => void = () => {}

	async watch(dirs: string[]): Promise<void> {
		for (const dir of dirs) {
			if (this.abortControllers.has(dir)) continue

			const controller = new AbortController()
			this.abortControllers.set(dir, controller)

			this.watchDir(dir, controller.signal)
		}
	}

	stop(): void {
		for (const controller of this.abortControllers.values()) {
			controller.abort()
		}
		this.abortControllers.clear()

		for (const timer of this.debounceTimers.values()) {
			clearTimeout(timer)
		}
		this.debounceTimers.clear()
	}

	private async watchDir(dir: string, signal: AbortSignal): Promise<void> {
		try {
			const watcher = watch(dir, { recursive: true, signal })

			for await (const event of watcher) {
				if (!event.filename) continue

				const filename = event.filename
				if (!filename.endsWith('.ts') && !filename.endsWith('.json')) continue

				this.handleChange(dir, filename)
			}
		} catch (err) {
			if ((err as Error).name === 'AbortError') return
			throw err
		}
	}

	private handleChange(dir: string, filename: string): void {
		const parts = filename.split('/')
		const skillDir = parts.length > 1 ? parts[0] : basename(dir)
		const debounceKey = `${dir}:${skillDir}`

		const existingTimer = this.debounceTimers.get(debounceKey)
		if (existingTimer) {
			clearTimeout(existingTimer)
		}

		const timer = setTimeout(() => {
			this.debounceTimers.delete(debounceKey)
			this.validateAndReload(dir, skillDir)
		}, this.debounceMs)

		this.debounceTimers.set(debounceKey, timer)
	}

	private async validateAndReload(dir: string, skillDir: string): Promise<void> {
		const manifestPath = join(dir, skillDir, 'manifest.json')

		try {
			const raw = await readFile(manifestPath, 'utf-8')
			const manifest = JSON.parse(raw) as { id?: string }

			if (!manifest.id || typeof manifest.id !== 'string') {
				return
			}

			this.onReload(manifest.id)
		} catch {
			// If manifest is missing or invalid, skip the reload
		}
	}
}
