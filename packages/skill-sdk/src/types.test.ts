import { describe, expect, it } from 'vitest'
import { skillCapabilitiesSchema, skillManifestSchema, toolDefinitionSchema } from './types.js'

describe('toolDefinitionSchema', () => {
	it('validates a correct tool definition', () => {
		const result = toolDefinitionSchema.safeParse({
			name: 'read_file',
			description: 'Read a file from disk',
			inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
		})
		expect(result.success).toBe(true)
	})

	it('rejects empty name', () => {
		const result = toolDefinitionSchema.safeParse({
			name: '',
			description: 'desc',
			inputSchema: {},
		})
		expect(result.success).toBe(false)
	})

	it('rejects empty description', () => {
		const result = toolDefinitionSchema.safeParse({
			name: 'tool',
			description: '',
			inputSchema: {},
		})
		expect(result.success).toBe(false)
	})
})

describe('skillCapabilitiesSchema', () => {
	it('provides defaults for empty object', () => {
		const result = skillCapabilitiesSchema.parse({})
		expect(result.network).toBe(false)
		expect(result.shell).toBe(false)
		expect(result.filesystem.enabled).toBe(false)
		expect(result.filesystem.paths).toEqual([])
		expect(result.env).toEqual([])
	})

	it('parses full capabilities', () => {
		const result = skillCapabilitiesSchema.parse({
			network: true,
			shell: true,
			filesystem: { enabled: true, paths: ['/tmp'] },
			env: ['API_KEY'],
		})
		expect(result.network).toBe(true)
		expect(result.shell).toBe(true)
		expect(result.filesystem.enabled).toBe(true)
		expect(result.filesystem.paths).toEqual(['/tmp'])
		expect(result.env).toEqual(['API_KEY'])
	})
})

describe('skillManifestSchema', () => {
	const validManifest = {
		id: 'test-skill',
		name: 'Test Skill',
		version: '1.0.0',
		description: 'A test skill',
		author: 'tester',
		tools: [
			{
				name: 'do_thing',
				description: 'Does a thing',
				inputSchema: { type: 'object' },
			},
		],
	}

	it('validates a correct manifest', () => {
		const result = skillManifestSchema.safeParse(validManifest)
		expect(result.success).toBe(true)
	})

	it('adds default capabilities when missing', () => {
		const result = skillManifestSchema.parse(validManifest)
		expect(result.capabilities.network).toBe(false)
		expect(result.capabilities.shell).toBe(false)
	})

	it('adds empty tools array when missing', () => {
		const { tools: _, ...noTools } = validManifest
		const result = skillManifestSchema.parse(noTools)
		expect(result.tools).toEqual([])
	})

	it('rejects missing id', () => {
		const { id: _, ...noId } = validManifest
		expect(skillManifestSchema.safeParse(noId).success).toBe(false)
	})

	it('rejects missing name', () => {
		const { name: _, ...noName } = validManifest
		expect(skillManifestSchema.safeParse(noName).success).toBe(false)
	})

	it('rejects missing version', () => {
		const { version: _, ...noVersion } = validManifest
		expect(skillManifestSchema.safeParse(noVersion).success).toBe(false)
	})

	it('rejects empty id', () => {
		expect(skillManifestSchema.safeParse({ ...validManifest, id: '' }).success).toBe(false)
	})
})
