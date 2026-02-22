import { describe, expect, it } from 'vitest'
import { defineSkill } from './skill.js'
import type { SkillManifest } from './types.js'

const validManifest: SkillManifest = {
	id: 'test',
	name: 'Test',
	version: '1.0.0',
	description: 'test skill',
	author: 'tester',
	capabilities: {
		network: false,
		filesystem: { enabled: false, paths: [] },
		shell: false,
		env: [],
	},
	tools: [
		{
			name: 'greet',
			description: 'Greet someone',
			inputSchema: { type: 'object', properties: { name: { type: 'string' } } },
		},
	],
}

describe('defineSkill', () => {
	it('creates a skill with valid manifest', () => {
		const skill = defineSkill(validManifest, async () => ({ success: true }))
		expect(skill.manifest.id).toBe('test')
		expect(skill.manifest.name).toBe('Test')
		expect(typeof skill.handler).toBe('function')
	})

	it('validates manifest on creation', () => {
		expect(() =>
			defineSkill({ ...validManifest, id: '' }, async () => ({ success: true })),
		).toThrow()
	})

	it('handler is callable', async () => {
		const skill = defineSkill(validManifest, async (_tool, args) => ({
			success: true,
			data: { greeting: `Hello ${args.name}` },
		}))

		const result = await skill.handler('greet', { name: 'World' }, {
			manifest: validManifest,
			env: {},
			log: () => {},
		})

		expect(result.success).toBe(true)
		expect((result.data as Record<string, string>).greeting).toBe('Hello World')
	})
})
