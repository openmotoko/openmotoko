import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { RegistryConfig, RegistryEntry, RegistrySearchParams, SkillDetail } from './types.js'

const DEFAULT_CONFIG: RegistryConfig = {
	registryUrl: process.env.REGISTRY_URL || 'https://registry.openmotoko.ai',
	cacheDir: join(homedir(), '.openmotoko', 'registry-cache'),
	cacheTtlMs: 3600_000,
}

interface CacheData {
	entries: RegistryEntry[]
	fetchedAt: number
}

export class RegistryClient {
	private config: RegistryConfig
	private cache: CacheData | null = null

	constructor(config?: Partial<RegistryConfig>) {
		this.config = { ...DEFAULT_CONFIG, ...config }
	}

	async getEntries(): Promise<RegistryEntry[]> {
		if (this.cache && Date.now() - this.cache.fetchedAt < this.config.cacheTtlMs) {
			return this.cache.entries
		}

		const cached = this.readDiskCache()
		if (cached) {
			this.cache = cached
			return cached.entries
		}

		const entries = await this.fetchRemote()
		this.cache = { entries, fetchedAt: Date.now() }
		this.writeDiskCache(this.cache)
		return entries
	}

	async search(params: RegistrySearchParams): Promise<RegistryEntry[]> {
		let entries = await this.getEntries()

		if (params.query) {
			const q = params.query.toLowerCase()
			entries = entries.filter(
				(e) => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q),
			)
		}
		if (params.tags?.length) {
			entries = entries.filter((e) => params.tags?.some((t) => e.tags.includes(t)))
		}
		if (params.verified !== undefined) {
			entries = entries.filter((e) => e.verified === params.verified)
		}

		const offset = params.offset ?? 0
		const limit = params.limit ?? 50
		return entries.slice(offset, offset + limit)
	}

	async download(entry: RegistryEntry): Promise<Buffer> {
		const res = await fetch(entry.downloadUrl)
		if (!res.ok) throw new Error(`Failed to download ${entry.name}: ${res.status}`)
		const buffer = Buffer.from(await res.arrayBuffer())

		const hash = createHash('sha256').update(buffer).digest('hex')
		if (hash !== entry.checksumSha256) {
			throw new Error(`Checksum mismatch for ${entry.name}`)
		}

		return buffer
	}

	async refreshCache(): Promise<RegistryEntry[]> {
		this.cache = null
		const entries = await this.fetchRemote()
		this.cache = { entries, fetchedAt: Date.now() }
		this.writeDiskCache(this.cache)
		return entries
	}

	private async fetchRemote(): Promise<RegistryEntry[]> {
		const res = await fetch(`${this.config.registryUrl}/api/skills`)
		if (!res.ok) throw new Error(`Registry fetch failed: ${res.status}`)
		const data = await res.json()
		return (data as { skills: RegistryEntry[] }).skills ?? []
	}

	private readDiskCache(): CacheData | null {
		const cachePath = join(this.config.cacheDir, 'index.json')
		if (!existsSync(cachePath)) return null
		try {
			const raw = readFileSync(cachePath, 'utf-8')
			const data = JSON.parse(raw) as CacheData
			if (Date.now() - data.fetchedAt > this.config.cacheTtlMs) return null
			return data
		} catch {
			return null
		}
	}

	async getSkillDetail(id: string): Promise<SkillDetail> {
		const res = await fetch(`${this.config.registryUrl}/api/skills/${id}`)
		if (!res.ok) throw new Error(`Failed to fetch skill detail: ${res.status}`)
		return (await res.json()) as SkillDetail
	}

	async rate(skillId: string, userId: string, stars: number, comment?: string): Promise<void> {
		const res = await fetch(`${this.config.registryUrl}/api/skills/${skillId}/rate`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ userId, stars, comment: comment ?? '' }),
		})
		if (!res.ok) throw new Error(`Failed to rate skill: ${res.status}`)
	}

	private writeDiskCache(data: CacheData): void {
		if (!existsSync(this.config.cacheDir)) {
			mkdirSync(this.config.cacheDir, { recursive: true })
		}
		writeFileSync(join(this.config.cacheDir, 'index.json'), JSON.stringify(data), 'utf-8')
	}
}
