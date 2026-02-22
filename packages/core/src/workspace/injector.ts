import type { WorkspacePrompts } from './types.js'

export function buildSystemPrompt(basePrompt: string | null, workspace: WorkspacePrompts): string {
	const parts: string[] = []

	if (workspace.agents) {
		parts.push(workspace.agents)
	}

	if (workspace.soul) {
		parts.push(workspace.soul)
	}

	if (workspace.tools) {
		parts.push(workspace.tools)
	}

	if (basePrompt) {
		parts.push(basePrompt)
	}

	return parts.join('\n\n---\n\n')
}

export function injectWorkspaceContext(
	systemPrompt: string | null,
	workspace: WorkspacePrompts,
): string {
	if (!workspace.agents && !workspace.soul && !workspace.tools) {
		return systemPrompt ?? ''
	}
	return buildSystemPrompt(systemPrompt, workspace)
}
