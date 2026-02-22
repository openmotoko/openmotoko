import type { ChildProcess } from 'node:child_process'

export type {
	IPCMessage,
	SkillCapabilities,
	SkillContext,
	SkillHandler,
	SkillManifest,
	ToolDefinition,
} from '@openmotoko/skill-sdk'

export interface ManagedProcess {
	skillId: string
	skillPath: string
	child: ChildProcess
	ready: boolean
	restartCount: number
	pending: Map<string, PendingRequest>
}

export interface PendingRequest {
	resolve: (value: unknown) => void
	reject: (reason: Error) => void
	timer: ReturnType<typeof setTimeout>
}
