import { z } from 'zod'

export const toolDefinitionSchema = z.object({
	name: z.string().min(1),
	description: z.string().min(1),
	inputSchema: z.record(z.string(), z.unknown()),
})

export const networkPolicySchema = z.object({
	allowedDomains: z.array(z.string()).default([]),
	blockedDomains: z.array(z.string()).default([]),
	allowPrivateRanges: z.boolean().default(false),
	maxRequestsPerMinute: z.number().default(60),
})

export const skillCapabilitiesSchema = z.object({
	network: z.union([z.boolean(), networkPolicySchema]).default(false),
	filesystem: z
		.object({
			enabled: z.boolean().default(false),
			paths: z.array(z.string()).default([]),
			readOnly: z.boolean().default(false),
		})
		.default({ enabled: false, paths: [], readOnly: false }),
	shell: z
		.union([
			z.boolean(),
			z.object({
				enabled: z.boolean().default(false),
				allowedCommands: z.array(z.string()).default([]),
			}),
		])
		.default(false),
	env: z.array(z.string()).default([]),
	browser: z.boolean().default(false),
	database: z.boolean().default(false),
})

export const trustLevelSchema = z.enum(['verified', 'signed', 'unsigned', 'revoked'])

export const skillManifestSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	version: z.string().min(1),
	description: z.string(),
	author: z.string(),
	capabilities: skillCapabilitiesSchema.default({
		network: false,
		filesystem: { enabled: false, paths: [], readOnly: false },
		shell: false,
		env: [],
		browser: false,
		database: false,
	}),
	tools: z.array(toolDefinitionSchema).default([]),
	signature: z.string().optional(),
	authorPublicKey: z.string().optional(),
	trustLevel: trustLevelSchema.default('unsigned'),
})

export type ToolDefinition = z.infer<typeof toolDefinitionSchema>
export type SkillCapabilities = z.infer<typeof skillCapabilitiesSchema>
export type SkillManifest = z.infer<typeof skillManifestSchema>
export type NetworkPolicy = z.infer<typeof networkPolicySchema>
export type TrustLevel = z.infer<typeof trustLevelSchema>

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
