import { resolve } from 'node:path'
import type { SkillManifest, ToolDefinition } from '@openmotoko/skill-sdk'
import { skillManifestSchema } from '@openmotoko/skill-sdk'
import type { CreateArtifactInput, UpdateArtifactInput } from '../artifacts/index.js'
import { artifactManager } from '../artifacts/index.js'
import { getDb } from '../db/client.js'
import { skills } from '../db/schema.js'
import { eventBus } from '../events/bus.js'
import type { ArtifactCreatedEvent, ArtifactUpdatedEvent } from '../events/types.js'
import { AnthropicProvider } from '../llm/providers/anthropic.js'
import { GoogleProvider } from '../llm/providers/google.js'
import { OllamaProvider } from '../llm/providers/ollama.js'
import { OpenAIProvider } from '../llm/providers/openai.js'
import type { RouterConfig } from '../llm/router.js'
import { LLMRouter } from '../llm/router.js'
import type { LLMProvider } from '../llm/types.js'
import { SkillRuntime } from '../skills/runtime.js'

interface ToolMapping {
	skillId: string
	toolDef: ToolDefinition
}

export class AgentRuntime {
	private skillRuntime: SkillRuntime
	private llmRouter: LLMRouter | null = null
	private toolMap = new Map<string, ToolMapping>()
	private skillsBasePath: string

	constructor(options?: { skillsBasePath?: string; timeoutMs?: number }) {
		this.skillRuntime = new SkillRuntime({ timeoutMs: options?.timeoutMs })
		this.skillsBasePath =
			options?.skillsBasePath ?? resolve(process.cwd(), 'node_modules/@openmotoko/skills/dist')
	}

	async initialize(): Promise<void> {
		this.initLLMRouter()
		await this.loadAndStartSkills()
	}

	private initLLMRouter(): void {
		const providers: LLMProvider[] = []

		if (process.env.ANTHROPIC_API_KEY) {
			providers.push(new AnthropicProvider(process.env.ANTHROPIC_API_KEY))
		}
		if (process.env.OPENAI_API_KEY) {
			providers.push(new OpenAIProvider(process.env.OPENAI_API_KEY))
		}
		if (process.env.GOOGLE_AI_API_KEY) {
			providers.push(new GoogleProvider(process.env.GOOGLE_AI_API_KEY))
		}

		const ollamaHost = process.env.OLLAMA_HOST ?? 'http://localhost:11434'
		providers.push(new OllamaProvider(ollamaHost))

		const config: RouterConfig = {
			providers,
			modelAliases: {
				fast: { provider: 'anthropic', model: 'claude-haiku-4-5' },
				smart: { provider: 'anthropic', model: 'claude-opus-4-6' },
				balanced: { provider: 'anthropic', model: 'claude-sonnet-4-6' },
			},
		}

		this.llmRouter = new LLMRouter(config)
	}

	private async loadAndStartSkills(): Promise<void> {
		const db = getDb()
		const rows = db.select().from(skills).all()

		for (const row of rows) {
			if (row.enabled !== 1) continue

			let manifest: SkillManifest
			try {
				manifest = skillManifestSchema.parse(JSON.parse(row.manifest))
			} catch {
				continue
			}

			const skillPath = resolve(this.skillsBasePath, row.id, 'index.js')

			try {
				await this.skillRuntime.startSkill(row.id, skillPath, manifest)
				for (const tool of manifest.tools) {
					this.toolMap.set(tool.name, { skillId: row.id, toolDef: tool })
				}
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err)
				console.error(`Failed to start skill ${row.id}: ${msg}`)
			}
		}
	}

	getRouter(): LLMRouter {
		if (!this.llmRouter) {
			this.initLLMRouter()
		}
		return this.llmRouter as LLMRouter
	}

	private getArtifactToolDefinitions(): ToolDefinition[] {
		return [
			{
				name: 'create_artifact',
				description:
					'Create a visual artifact (code file, markdown document, HTML page, or Mermaid diagram) that will be rendered in the Canvas workspace',
				inputSchema: {
					type: 'object',
					properties: {
						conversationId: {
							type: 'string',
							description: 'The conversation ID to attach this artifact to',
						},
						type: {
							type: 'string',
							enum: ['code', 'markdown', 'html', 'mermaid', 'text'],
							description: 'The type of artifact',
						},
						title: { type: 'string', description: 'A short title for the artifact' },
						content: { type: 'string', description: 'The full content of the artifact' },
						language: {
							type: 'string',
							description:
								'Programming language for code artifacts (e.g. typescript, python, rust)',
						},
					},
					required: ['conversationId', 'type', 'title', 'content'],
				},
			},
			{
				name: 'update_artifact',
				description: 'Update an existing artifact with new content. Creates a new version.',
				inputSchema: {
					type: 'object',
					properties: {
						id: { type: 'string', description: 'The artifact ID to update' },
						content: { type: 'string', description: 'The new content for the artifact' },
						title: { type: 'string', description: 'Optional new title' },
					},
					required: ['id', 'content'],
				},
			},
		]
	}

	getToolDefinitions(): ToolDefinition[] {
		return [
			...[...this.toolMap.values()].map((m) => m.toolDef),
			...this.getArtifactToolDefinitions(),
		]
	}

	private async handleArtifactToolCall(
		toolName: string,
		input: Record<string, unknown>,
	): Promise<string> {
		if (toolName === 'create_artifact') {
			const artifact = await artifactManager.create(input as unknown as CreateArtifactInput)
			const event: ArtifactCreatedEvent = {
				type: 'artifact:created',
				artifactId: artifact.id,
				conversationId: artifact.conversationId,
				title: artifact.title,
				artifactType: artifact.type,
			}
			eventBus.emit(event.type, event)
			return JSON.stringify({ success: true, artifact })
		}

		const { id, ...rest } = input
		const artifact = await artifactManager.update(
			id as string,
			rest as unknown as UpdateArtifactInput,
		)
		const event: ArtifactUpdatedEvent = {
			type: 'artifact:updated',
			artifactId: artifact.id,
			conversationId: artifact.conversationId,
			title: artifact.title,
			version: artifact.version,
		}
		eventBus.emit(event.type, event)
		return JSON.stringify({ success: true, artifact })
	}

	async executeToolCall(toolName: string, input: unknown): Promise<string> {
		if (toolName === 'create_artifact' || toolName === 'update_artifact') {
			try {
				return await this.handleArtifactToolCall(toolName, input as Record<string, unknown>)
			} catch (err) {
				return JSON.stringify({
					success: false,
					error: err instanceof Error ? err.message : 'Artifact tool execution failed',
				})
			}
		}

		const mapping = this.toolMap.get(toolName)
		if (!mapping) {
			return JSON.stringify({
				success: false,
				error: `Unknown tool: ${toolName}`,
			})
		}

		try {
			const result = await this.skillRuntime.executeToolCall(mapping.skillId, toolName, input)
			return typeof result === 'string' ? result : JSON.stringify(result)
		} catch (err) {
			return JSON.stringify({
				success: false,
				error: err instanceof Error ? err.message : 'Tool execution failed',
			})
		}
	}

	findSkillForTool(toolName: string): string | null {
		return this.toolMap.get(toolName)?.skillId ?? null
	}

	async shutdown(): Promise<void> {
		await this.skillRuntime.stopAll()
	}
}

let instance: AgentRuntime | null = null

export function getAgentRuntime(): AgentRuntime {
	if (!instance) {
		instance = new AgentRuntime()
	}
	return instance
}

export async function initAgentRuntime(options?: {
	skillsBasePath?: string
	timeoutMs?: number
}): Promise<AgentRuntime> {
	instance = new AgentRuntime(options)
	await instance.initialize()
	return instance
}
