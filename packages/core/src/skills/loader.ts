import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { skillManifestSchema } from '@openmotoko/skill-sdk'

export async function loadSkill(skillPath: string): Promise<SkillManifest> {
	const manifestPath = join(skillPath, 'manifest.json')
	const raw = await readFile(manifestPath, 'utf-8')
	const data = JSON.parse(raw)
	return skillManifestSchema.parse(data)
}
