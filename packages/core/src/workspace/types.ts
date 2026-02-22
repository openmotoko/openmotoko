export interface WorkspacePrompts {
	agents: string | null
	soul: string | null
	tools: string | null
}

export interface WorkspaceConfig {
	basePath: string
	files: {
		agents: string
		soul: string
		tools: string
	}
}
