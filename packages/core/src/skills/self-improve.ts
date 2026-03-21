import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface Learning {
	id: string
	skillId: string
	type: 'error' | 'optimization' | 'preference'
	summary: string
	context: string
	suggestedFix?: string
	timestamp: number
}

const LEARNINGS_DIR = join(homedir(), '.openmotoko', '.learnings')

export class SkillLearner {
	private learningsDir: string

	constructor(learningsDir?: string) {
		this.learningsDir = learningsDir ?? LEARNINGS_DIR
	}

	async recordLearning(learning: Learning): Promise<void> {
		await mkdir(this.learningsDir, { recursive: true })

		const filename = `${learning.id}.json`
		const filePath = join(this.learningsDir, filename)
		await writeFile(filePath, JSON.stringify(learning, null, '\t'), 'utf-8')
	}

	async getLearnings(skillId?: string): Promise<Learning[]> {
		let entries: string[]
		try {
			entries = await readdir(this.learningsDir)
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
				return []
			}
			throw err
		}

		const learnings: Learning[] = []

		for (const entry of entries) {
			if (!entry.endsWith('.json')) continue

			try {
				const raw = await readFile(join(this.learningsDir, entry), 'utf-8')
				const learning = JSON.parse(raw) as Learning

				if (!skillId || learning.skillId === skillId) {
					learnings.push(learning)
				}
			} catch {
				// Skip malformed files
			}
		}

		learnings.sort((a, b) => b.timestamp - a.timestamp)
		return learnings
	}

	async suggestImprovement(skillId: string, error: string): Promise<string> {
		const learnings = await this.getLearnings(skillId)

		const errorLearnings = learnings.filter((l) => l.type === 'error')
		const relevantLearnings = errorLearnings.filter(
			(l) =>
				l.context.toLowerCase().includes(error.toLowerCase().slice(0, 50)) ||
				l.summary.toLowerCase().includes(error.toLowerCase().slice(0, 50)),
		)

		if (relevantLearnings.length > 0) {
			const best = relevantLearnings[0]
			if (best.suggestedFix) {
				return `Based on previous learning "${best.summary}": ${best.suggestedFix}`
			}
			return `Similar error encountered before: "${best.summary}". Context: ${best.context}`
		}

		const optimizations = learnings.filter((l) => l.type === 'optimization')
		if (optimizations.length > 0) {
			const tips = optimizations
				.slice(0, 3)
				.map((l) => `- ${l.summary}`)
				.join('\n')
			return `No direct match found for this error. Recent optimization learnings for this skill:\n${tips}`
		}

		return `No previous learnings found for skill "${skillId}". Consider recording this error for future reference.`
	}
}
