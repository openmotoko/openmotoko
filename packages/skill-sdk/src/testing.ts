import type { Skill } from './skill.js'
import type { SkillContext, SkillManifest, ToolResult } from './types.js'

interface TestLog {
	timestamp: number
	message: string
}

interface TestRunResult {
	toolName: string
	input: Record<string, unknown>
	result: ToolResult
	logs: TestLog[]
	durationMs: number
}

export class SkillTestHarness {
	private skill: Skill
	private env: Record<string, string>

	constructor(skill: Skill, env?: Record<string, string>) {
		this.skill = skill
		this.env = env ?? {}
	}

	async runTool(toolName: string, input: Record<string, unknown>): Promise<TestRunResult> {
		const toolDef = this.skill.manifest.tools.find((t) => t.name === toolName)
		if (!toolDef) {
			throw new Error(
				`Tool "${toolName}" not found in manifest. Available: ${this.skill.manifest.tools.map((t) => t.name).join(', ')}`,
			)
		}

		const logs: TestLog[] = []
		const ctx = this.createContext(logs)

		const start = performance.now()
		const result = await this.skill.handler(toolName, input, ctx)
		const durationMs = Math.round(performance.now() - start)

		return { toolName, input, result, logs, durationMs }
	}

	async runAllTools(inputs: Record<string, Record<string, unknown>>): Promise<TestRunResult[]> {
		const results: TestRunResult[] = []
		for (const [toolName, input] of Object.entries(inputs)) {
			results.push(await this.runTool(toolName, input))
		}
		return results
	}

	getManifest(): SkillManifest {
		return this.skill.manifest
	}

	getToolNames(): string[] {
		return this.skill.manifest.tools.map((t) => t.name)
	}

	private createContext(logs: TestLog[]): SkillContext {
		return {
			manifest: this.skill.manifest,
			env: this.env,
			log: (message: string) => {
				logs.push({ timestamp: Date.now(), message })
			},
		}
	}
}
