import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { WorkspaceConfig, WorkspacePrompts } from './types.js'

const DEFAULT_BASE = join(homedir(), '.openmotoko', 'workspace')

const DEFAULT_AGENTS = `# Agent Configuration

You are OpenMotoko, a personal AI assistant running locally.
You have access to tools and skills that let you interact with the filesystem, web, and external services.
Be concise, accurate, and helpful. Ask for clarification when needed.
`

const DEFAULT_SOUL = `# Personality

- Friendly but professional
- Direct and concise
- Proactive about suggesting solutions
- Transparent about limitations
`

const DEFAULT_TOOLS = `# Tool Usage Guidelines

- Use the most specific tool available for the task
- Confirm destructive operations before executing
- Report errors clearly with context
`

const DEFAULT_CONFIG: WorkspaceConfig = {
	basePath: DEFAULT_BASE,
	files: {
		agents: 'AGENTS.md',
		soul: 'SOUL.md',
		tools: 'TOOLS.md',
	},
}

function ensureWorkspace(config: WorkspaceConfig): void {
	if (!existsSync(config.basePath)) {
		mkdirSync(config.basePath, { recursive: true })
	}

	const defaults: Record<string, string> = {
		[config.files.agents]: DEFAULT_AGENTS,
		[config.files.soul]: DEFAULT_SOUL,
		[config.files.tools]: DEFAULT_TOOLS,
	}

	for (const [filename, content] of Object.entries(defaults)) {
		const filePath = join(config.basePath, filename)
		if (!existsSync(filePath)) {
			writeFileSync(filePath, content, 'utf-8')
		}
	}
}

function readFile(basePath: string, filename: string): string | null {
	const filePath = join(basePath, filename)
	if (!existsSync(filePath)) return null
	const content = readFileSync(filePath, 'utf-8').trim()
	return content || null
}

export function loadWorkspacePrompts(config?: Partial<WorkspaceConfig>): WorkspacePrompts {
	const resolved: WorkspaceConfig = {
		basePath: config?.basePath ?? DEFAULT_CONFIG.basePath,
		files: {
			agents: config?.files?.agents ?? DEFAULT_CONFIG.files.agents,
			soul: config?.files?.soul ?? DEFAULT_CONFIG.files.soul,
			tools: config?.files?.tools ?? DEFAULT_CONFIG.files.tools,
		},
	}

	ensureWorkspace(resolved)

	return {
		agents: readFile(resolved.basePath, resolved.files.agents),
		soul: readFile(resolved.basePath, resolved.files.soul),
		tools: readFile(resolved.basePath, resolved.files.tools),
	}
}

export function getWorkspacePath(config?: Partial<WorkspaceConfig>): string {
	return config?.basePath ?? DEFAULT_BASE
}
