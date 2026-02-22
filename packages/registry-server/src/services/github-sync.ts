import { eq } from 'drizzle-orm'
import { getRegistryDb } from '../db/client.js'
import { registrySkills } from '../db/schema.js'

const GITHUB_INDEX_URL =
	'https://raw.githubusercontent.com/openmotoko/skill-registry/main/index.json'

interface GitHubSkillEntry {
	id: string
	name: string
	version: string
	description: string
	author: string
	repository: string
	manifestUrl: string
	downloadUrl: string
	checksumSha256: string
	downloads: number
	verified: boolean
	tags: string[]
	publishedAt: number
}

export async function syncFromGitHub(): Promise<{ imported: number; updated: number }> {
	const res = await fetch(GITHUB_INDEX_URL)
	if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`)

	const data = (await res.json()) as { skills: GitHubSkillEntry[] }
	const entries = data.skills ?? []
	const db = getRegistryDb()

	let imported = 0
	let updated = 0

	for (const entry of entries) {
		const existing = db.select().from(registrySkills).where(eq(registrySkills.id, entry.id)).all()

		if (existing.length > 0) {
			db.update(registrySkills)
				.set({
					name: entry.name,
					version: entry.version,
					description: entry.description,
					author: entry.author,
					repository: entry.repository,
					downloadUrl: entry.downloadUrl,
					checksumSha256: entry.checksumSha256,
					verified: entry.verified ? 1 : 0,
					tags: JSON.stringify(entry.tags),
				})
				.where(eq(registrySkills.id, entry.id))
				.run()
			updated++
		} else {
			db.insert(registrySkills)
				.values({
					id: entry.id,
					name: entry.name,
					version: entry.version,
					description: entry.description,
					author: entry.author,
					repository: entry.repository,
					downloadUrl: entry.downloadUrl,
					checksumSha256: entry.checksumSha256,
					downloads: entry.downloads,
					verified: entry.verified ? 1 : 0,
					tags: JSON.stringify(entry.tags),
					publishedAt: entry.publishedAt,
				})
				.run()
			imported++
		}
	}

	return { imported, updated }
}

export async function exportToGitHub(): Promise<GitHubSkillEntry[]> {
	const db = getRegistryDb()
	const rows = db.select().from(registrySkills).all()

	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		version: r.version,
		description: r.description,
		author: r.author,
		repository: r.repository,
		manifestUrl: '',
		downloadUrl: r.downloadUrl,
		checksumSha256: r.checksumSha256,
		downloads: r.downloads,
		verified: r.verified === 1,
		tags: JSON.parse(r.tags),
		publishedAt: r.publishedAt,
	}))
}
