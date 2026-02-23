import { z } from 'zod'

export const gatewayConfigSchema = z
	.object({
		bind: z.enum(['loopback', '0.0.0.0']).default('loopback'),
		port: z.number().int().min(1).max(65535).default(3000),
		auth: z
			.object({
				password: z.string().optional(),
				sessionMaxAge: z.number().int().min(60_000).default(86_400_000),
			})
			.prefault({}),
		tailscale: z
			.object({
				enabled: z.boolean().default(false),
				trustedProxies: z.array(z.string()).default([]),
			})
			.prefault({}),
	})
	.prefault({})

export const channelPolicySchema = z.object({
	dmPolicy: z.enum(['open', 'pairing', 'allowlist']).default('pairing'),
	allowFrom: z.array(z.string()).default([]),
	requireMention: z.boolean().default(false),
})

export const channelConfigSchema = z
	.record(
		z.string(),
		z
			.object({
				token: z.string().optional(),
				enabled: z.boolean().default(true),
				policy: channelPolicySchema.prefault({}),
			})
			.passthrough(),
	)
	.default({})

export const agentDefaultsSchema = z
	.object({
		model: z.string().default('balanced'),
		maxTokens: z.number().int().optional(),
		temperature: z.number().min(0).max(2).optional(),
		sandbox: z
			.object({
				mode: z.enum(['off', 'non-main', 'all']).default('off'),
				image: z.string().default('openmotoko/sandbox:latest'),
				networkPolicy: z.enum(['none', 'restricted', 'full']).default('restricted'),
			})
			.prefault({}),
		workspace: z.string().optional(),
	})
	.prefault({})

export const toolsConfigSchema = z
	.object({
		filesystem: z
			.object({
				allowedPaths: z.array(z.string()).default(['~', '.']),
				maxFileSize: z.number().int().default(10_485_760),
			})
			.prefault({}),
		shell: z
			.object({
				blocked: z.array(z.string()).default([]),
				timeout: z.number().int().default(30_000),
				elevated: z.boolean().default(false),
			})
			.prefault({}),
	})
	.prefault({})

export const pulseConfigSchema = z
	.object({
		enabled: z.boolean().default(false),
		budget: z
			.object({
				daily: z.number().int().default(200_000),
				model: z.string().default('fast'),
			})
			.prefault({}),
		activeHours: z
			.object({
				start: z
					.string()
					.regex(/^\d{2}:\d{2}$/)
					.default('07:00'),
				end: z
					.string()
					.regex(/^\d{2}:\d{2}$/)
					.default('23:00'),
				timezone: z.string().default('UTC'),
			})
			.prefault({}),
		tasks: z
			.array(
				z.object({
					id: z.string(),
					trigger: z.discriminatedUnion('type', [
						z.object({ type: z.literal('interval'), every: z.string() }),
						z.object({ type: z.literal('cron'), schedule: z.string() }),
						z.object({ type: z.literal('event'), event: z.string() }),
					]),
					condition: z.string().optional(),
					prompt: z.string(),
					priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
					model: z.string().default('fast'),
				}),
			)
			.default([]),
	})
	.prefault({})

export const mcpConfigSchema = z
	.object({
		servers: z
			.array(
				z.object({
					id: z.string(),
					name: z.string().optional(),
					transport: z.enum(['stdio', 'http']).default('stdio'),
					command: z.string().optional(),
					args: z.array(z.string()).optional(),
					url: z.string().optional(),
					env: z.record(z.string(), z.string()).optional(),
				}),
			)
			.default([]),
		expose: z.boolean().default(false),
	})
	.prefault({})

export const llmProviderConfigSchema = z
	.object({
		providers: z
			.array(
				z.object({
					id: z.string(),
					type: z.enum(['anthropic', 'openai', 'google', 'ollama', 'generic-openai']),
					apiKey: z.string().optional(),
					baseUrl: z.string().optional(),
					name: z.string().optional(),
				}),
			)
			.default([]),
		aliases: z
			.object({
				fast: z.object({ provider: z.string(), model: z.string() }).optional(),
				balanced: z.object({ provider: z.string(), model: z.string() }).optional(),
				smart: z.object({ provider: z.string(), model: z.string() }).optional(),
			})
			.prefault({}),
	})
	.prefault({})

export const notificationsConfigSchema = z
	.object({
		routing: z
			.object({
				critical: z.string().default('whatsapp'),
				important: z.string().default('telegram'),
				informational: z.string().default('webchat'),
				digest: z.string().default('email'),
				silent: z.string().default('activity-feed'),
			})
			.prefault({}),
	})
	.prefault({})

export const openMotokoConfigSchema = z.object({
	gateway: gatewayConfigSchema,
	channels: channelConfigSchema,
	agents: agentDefaultsSchema,
	tools: toolsConfigSchema,
	pulse: pulseConfigSchema,
	mcp: mcpConfigSchema,
	llm: llmProviderConfigSchema,
	notifications: notificationsConfigSchema,
	redactSensitive: z.enum(['tools', 'all', 'off']).default('off'),
})

export type OpenMotokoConfig = z.infer<typeof openMotokoConfigSchema>
export type GatewayConfig = z.infer<typeof gatewayConfigSchema>
export type ChannelPolicy = z.infer<typeof channelPolicySchema>
export type AgentDefaults = z.infer<typeof agentDefaultsSchema>
export type PulseConfig = z.infer<typeof pulseConfigSchema>
export type McpConfig = z.infer<typeof mcpConfigSchema>
export type NotificationsConfig = z.infer<typeof notificationsConfigSchema>
