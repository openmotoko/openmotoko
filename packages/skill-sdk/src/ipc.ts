import type { SkillManifest } from './types.js'

export interface IPCInitMessage {
	type: 'init'
	skillPath: string
	manifest: SkillManifest
}

export interface IPCReadyMessage {
	type: 'ready'
}

export interface IPCExecuteMessage {
	type: 'execute'
	requestId: string
	toolName: string
	input: unknown
}

export interface IPCResultMessage {
	type: 'result'
	requestId: string
	data: unknown
}

export interface IPCErrorMessage {
	type: 'error'
	requestId: string | null
	message: string
	code?: string
}

export interface IPCShutdownMessage {
	type: 'shutdown'
}

export type IPCMessage =
	| IPCInitMessage
	| IPCReadyMessage
	| IPCExecuteMessage
	| IPCResultMessage
	| IPCErrorMessage
	| IPCShutdownMessage
