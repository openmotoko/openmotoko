import { describe, expect, it } from 'vitest'
import { defineSkill } from './skill.js'
import { SkillTestHarness } from './testing.js'
import type { SkillManifest } from './types.js'

const manifest: SkillManifest = {
	id: 'calc',
	name: 'Calculator',
	version: '1.0.0',
	description: 'simple calculator',
	author: 'test',
	capabilities: { network: false, filesystem: { enabled: false, paths: [] }, shell: false, env: [] },
	tools: [
		{ name: 'add', description: 'Add two numbers', inputSchema: { type: 'object' } },
		{ name: 'multiply', description: 'Multiply two numbers', inputSchema: { type: 'object' } },
	],
}

const calcSkill = defineSkill(manifest, async (toolName, args, ctx) => {
	ctx.log(`Running ${toolName}`)
	const a = args.a as number
	const b = args.b as number
	if (toolName === 'add') return { success: true, data: { result: a + b } }
	if (toolName === 'multiply') return { success: true, data: { result: a * b } }
	return { success: false, error: `Unknown tool: ${toolName}` }
})

describe('SkillTestHarness', () => {
	it('runs a tool and returns result', async () => {
		const harness = new SkillTestHarness(calcSkill)
		const run = await harness.runTool('add', { a: 3, b: 4 })
		expect(run.result.success).toBe(true)
		expect((run.result.data as Record<string, number>).result).toBe(7)
	})

	it('captures logs', async () => {
		const harness = new SkillTestHarness(calcSkill)
		const run = await harness.runTool('add', { a: 1, b: 2 })
		expect(run.logs.length).toBeGreaterThan(0)
		expect(run.logs[0].message).toContain('add')
	})

	it('measures duration', async () => {
		const harness = new SkillTestHarness(calcSkill)
		const run = await harness.runTool('multiply', { a: 5, b: 3 })
		expect(run.durationMs).toBeGreaterThanOrEqual(0)
	})

	it('throws for unknown tool', async () => {
		const harness = new SkillTestHarness(calcSkill)
		await expect(harness.runTool('divide', { a: 1, b: 2 })).rejects.toThrow('Tool "divide" not found')
	})

	it('runs all tools', async () => {
		const harness = new SkillTestHarness(calcSkill)
		const results = await harness.runAllTools({
			add: { a: 1, b: 2 },
			multiply: { a: 3, b: 4 },
		})
		expect(results).toHaveLength(2)
		expect((results[0].result.data as Record<string, number>).result).toBe(3)
		expect((results[1].result.data as Record<string, number>).result).toBe(12)
	})

	it('returns manifest', () => {
		const harness = new SkillTestHarness(calcSkill)
		expect(harness.getManifest().id).toBe('calc')
	})

	it('returns tool names', () => {
		const harness = new SkillTestHarness(calcSkill)
		expect(harness.getToolNames()).toEqual(['add', 'multiply'])
	})

	it('passes custom env', async () => {
		const envSkill = defineSkill(
			{ ...manifest, id: 'env-test' },
			async (_tool, _args, ctx) => ({
				success: true,
				data: { key: ctx.env.MY_KEY },
			}),
		)
		const harness = new SkillTestHarness(envSkill, { MY_KEY: 'secret123' })
		const run = await harness.runTool('add', {})
		expect((run.result.data as Record<string, string>).key).toBe('secret123')
	})
})
