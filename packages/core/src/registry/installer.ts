import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { skillManifestSchema } from '@openmotoko/skill-sdk'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/client.js'
import { skills } from '../db/schema.js'
import { RegistryClient } from './client.js'
import type { RegistryEntry } from './types.js'

const SKILLS_DIR = join(homedir(), '.openmotoko', 'skills')

export interface InstallResult {
	id: string
	name: string
	version: string
	path: string
}

export class SkillInstaller {
	private client: RegistryClient

	constructor(client?: RegistryClient) {
		this.client = client ?? new RegistryClient()
	}

	async install(entryOrId: RegistryEntry | string): Promise<InstallResult> {
		const entry = typeof entryOrId === 'string' ? await this.resolveEntry(entryOrId) : entryOrId

		const buffer = await this.client.download(entry)
		const skillDir = join(SKILLS_DIR, entry.id)

		if (!existsSync(SKILLS_DIR)) {
			mkdirSync(SKILLS_DIR, { recursive: true })
		}
		if (existsSync(skillDir)) {
			rmSync(skillDir, { recursive: true, force: true })
		}
		mkdirSync(skillDir, { recursive: true })

		await this.extractPackage(buffer, skillDir)
		const manifest = this.validateManifest(skillDir)
		this.registerInDb(entry, manifest)

		return {
			id: entry.id,
			name: manifest.name,
			version: manifest.version,
			path: skillDir,
		}
	}

	async uninstall(skillId: string): Promise<void> {
		const db = getDb()
		const skillDir = join(SKILLS_DIR, skillId)

		db.delete(skills).where(eq(skills.id, skillId)).run()

		if (existsSync(skillDir)) {
			rmSync(skillDir, { recursive: true, force: true })
		}
	}

	private async resolveEntry(id: string): Promise<RegistryEntry> {
		const entries = await this.client.getEntries()
		const entry = entries.find((e) => e.id === id)
		if (!entry) throw new Error(`Skill "${id}" not found in registry`)
		return entry
	}

	private async extractPackage(buffer: Buffer, targetDir: string): Promise<void> {
		const { execSync } = await import('node:child_process')
		const archivePath = join(targetDir, '_archive.tar.gz')
		writeFileSync(archivePath, buffer)
		execSync(`tar -xzf _archive.tar.gz --strip-components=1`, { cwd: targetDir })
		rmSync(archivePath)
	}

	private validateManifest(skillDir: string): SkillManifest {
		const manifestPath = join(skillDir, 'manifest.json')
		if (!existsSync(manifestPath)) {
			throw new Error(`No manifest.json found in skill package`)
		}
		const raw = readFileSync(manifestPath, 'utf-8')
		return skillManifestSchema.parse(JSON.parse(raw))
	}

	private registerInDb(entry: RegistryEntry, manifest: SkillManifest): void {
		const db = getDb()
		const existing = db.select().from(skills).where(eq(skills.id, entry.id)).all()

		if (existing.length > 0) {
			db.update(skills)
				.set({
					name: manifest.name,
					version: manifest.version,
					description: manifest.description,
					manifest: JSON.stringify(manifest),
				})
				.where(eq(skills.id, entry.id))
				.run()
			return
		}

		db.insert(skills)
			.values({
				id: entry.id,
				name: manifest.name,
				version: manifest.version,
				description: manifest.description,
				manifest: JSON.stringify(manifest),
				enabled: 1,
				installedAt: Date.now(),
			})
			.run()
	}
}
