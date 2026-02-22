import type { SkillHandler, SkillManifest } from './types.js'
import { skillManifestSchema } from './types.js'

export interface Skill {
	manifest: SkillManifest
	handler: SkillHandler
}

export function defineSkill(manifest: SkillManifest, handler: SkillHandler): Skill {
	return {
		manifest: skillManifestSchema.parse(manifest),
		handler,
	}
}
