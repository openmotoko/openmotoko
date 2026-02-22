import type { SkillManifest, ToolDefinition } from '@openmotoko/skill-sdk'
import { skillManifestSchema } from '@openmotoko/skill-sdk'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/client.js'
import { skills } from '../db/schema.js'

export interface InstalledSkill {
	id: string
	name: string
	version: string
	description: string
	manifest: SkillManifest
	enabled: boolean
	installedAt: number
}

export function getInstalledSkills(): InstalledSkill[] {
	const db = getDb()
	const rows = db.select().from(skills).all()
	return rows.map((row) => ({
		id: row.id,
		name: row.name,
		version: row.version,
		description: row.description,
		manifest: skillManifestSchema.parse(JSON.parse(row.manifest)),
		enabled: row.enabled === 1,
		installedAt: row.installedAt,
	}))
}

export function toggleSkill(id: string, enabled: boolean): void {
	const db = getDb()
	db.update(skills)
		.set({ enabled: enabled ? 1 : 0 })
		.where(eq(skills.id, id))
		.run()
}

export function getSkillTools(skillId: string): ToolDefinition[] {
	const db = getDb()
	const [row] = db.select().from(skills).where(eq(skills.id, skillId)).all()
	if (!row) return []
	const manifest = skillManifestSchema.parse(JSON.parse(row.manifest))
	return manifest.tools
}
