import { z } from 'zod'

export const toolDefinitionSchema = z.object({
	name: z.string().min(1),
	description: z.string().min(1),
	inputSchema: z.record(z.string(), z.unknown()),
})

export const skillCapabilitiesSchema = z.object({
	network: z.boolean().default(false),
	filesystem: z
		.object({
			enabled: z.boolean().default(false),
			paths: z.array(z.string()).default([]),
		})
		.default({ enabled: false, paths: [] }),
	shell: z.boolean().default(false),
	env: z.array(z.string()).default([]),
})

export const skillManifestSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	version: z.string().min(1),
	description: z.string(),
	author: z.string(),
	capabilities: skillCapabilitiesSchema.default({
		network: false,
		filesystem: { enabled: false, paths: [] },
		shell: false,
		env: [],
	}),
	tools: z.array(toolDefinitionSchema).default([]),
})

export type ToolDefinition = z.infer<typeof toolDefinitionSchema>
export type SkillCapabilities = z.infer<typeof skillCapabilitiesSchema>
export type SkillManifest = z.infer<typeof skillManifestSchema>

export interface ToolResult {
	success: boolean
	data?: unknown
	error?: string
}

export interface SkillContext {
	manifest: SkillManifest
	env: Record<string, string | undefined>
	log: (message: string) => void
}

export type SkillHandler = (
	toolName: string,
	args: Record<string, unknown>,
	ctx: SkillContext,
) => Promise<ToolResult>
