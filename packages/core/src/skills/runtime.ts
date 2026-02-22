import { fork } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IPCMessage, SkillManifest } from '@openmotoko/skill-sdk'
import { nanoid } from 'nanoid'
import type { ManagedProcess } from './types.js'

const WORKER_PATH = join(dirname(fileURLToPath(import.meta.url)), 'worker.js')
const DEFAULT_TIMEOUT_MS = 30_000
const MAX_RESTARTS = 3

export class SkillRuntime {
	private processes = new Map<string, ManagedProcess>()
	private timeoutMs: number

	constructor(options?: { timeoutMs?: number }) {
		this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
	}

	async startSkill(skillId: string, skillPath: string, manifest: SkillManifest): Promise<void> {
		if (this.processes.has(skillId)) return
		await this.spawn(skillId, skillPath, manifest)
	}

	async executeToolCall(skillId: string, toolName: string, input: unknown): Promise<unknown> {
		const managed = this.processes.get(skillId)
		if (!managed?.ready) {
			throw new Error(`Skill ${skillId} is not running`)
		}

		const requestId = nanoid()

		return new Promise<unknown>((resolve, reject) => {
			const timer = setTimeout(() => {
				managed.pending.delete(requestId)
				reject(new Error(`Tool call ${toolName} timed out after ${this.timeoutMs}ms`))
			}, this.timeoutMs)

			managed.pending.set(requestId, { resolve, reject, timer })

			const msg: IPCMessage = { type: 'execute', requestId, toolName, input }
			if (managed.child.connected) {
				managed.child.send(msg)
			} else {
				clearTimeout(timer)
				managed.pending.delete(requestId)
				reject(new Error(`Skill ${skillId} IPC channel closed`))
			}
		})
	}

	async stopSkill(skillId: string): Promise<void> {
		const managed = this.processes.get(skillId)
		if (!managed) return

		managed.restartCount = MAX_RESTARTS
		this.processes.delete(skillId)

		for (const pending of managed.pending.values()) {
			clearTimeout(pending.timer)
			pending.reject(new Error(`Skill ${skillId} stopped`))
		}
		managed.pending.clear()

		if (managed.child.connected) {
			try {
				managed.child.send({ type: 'shutdown' } satisfies IPCMessage)
			} catch {
				void 0
			}
		}

		await new Promise<void>((resolve) => {
			if (managed.child.exitCode !== null || managed.child.signalCode !== null) {
				resolve()
				return
			}
			const timer = setTimeout(() => {
				managed.child.kill('SIGKILL')
				resolve()
			}, 5_000)
			managed.child.once('exit', () => {
				clearTimeout(timer)
				resolve()
			})
		})
	}

	async stopAll(): Promise<void> {
		const ids = [...this.processes.keys()]
		await Promise.all(ids.map((id) => this.stopSkill(id)))
	}

	getRunningSkills(): string[] {
		return [...this.processes.entries()].filter(([, proc]) => proc.ready).map(([id]) => id)
	}

	isReady(skillId: string): boolean {
		return this.processes.get(skillId)?.ready ?? false
	}

	private async spawn(skillId: string, skillPath: string, manifest: SkillManifest): Promise<void> {
		const existingRestarts = this.processes.get(skillId)?.restartCount ?? 0

		const child = fork(WORKER_PATH, [], {
			stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
		})

		const managed: ManagedProcess = {
			skillId,
			skillPath,
			child,
			ready: false,
			restartCount: existingRestarts,
			pending: new Map(),
		}

		this.processes.set(skillId, managed)

		child.on('message', (raw) => {
			this.onMessage(skillId, raw as IPCMessage)
		})

		child.on('exit', (code) => {
			this.onExit(skillId, code, manifest)
		})

		child.on('error', (err) => {
			this.onProcessError(skillId, err)
		})

		const initMsg: IPCMessage = { type: 'init', skillPath, manifest }
		child.send(initMsg)

		await this.waitForReady(managed)
	}

	private waitForReady(managed: ManagedProcess): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			let settled = false

			const timer = setTimeout(() => {
				if (settled) return
				settled = true
				reject(new Error(`Skill ${managed.skillId} init timed out`))
			}, this.timeoutMs)

			managed.child.on('message', (raw) => {
				if (settled) return
				const msg = raw as IPCMessage
				if (msg.type === 'ready') {
					settled = true
					clearTimeout(timer)
					managed.ready = true
					resolve()
				}
				if (msg.type === 'error' && msg.requestId === null) {
					settled = true
					clearTimeout(timer)
					reject(new Error(msg.message))
				}
			})
		})
	}

	private onMessage(skillId: string, msg: IPCMessage): void {
		const managed = this.processes.get(skillId)
		if (!managed) return

		if (msg.type === 'result') {
			const pending = managed.pending.get(msg.requestId)
			if (pending) {
				clearTimeout(pending.timer)
				managed.pending.delete(msg.requestId)
				pending.resolve(msg.data)
			}
		}

		if (msg.type === 'error' && msg.requestId !== null) {
			const pending = managed.pending.get(msg.requestId)
			if (pending) {
				clearTimeout(pending.timer)
				managed.pending.delete(msg.requestId)
				pending.reject(new Error(msg.message))
			}
		}
	}

	private onExit(skillId: string, code: number | null, manifest: SkillManifest): void {
		const managed = this.processes.get(skillId)
		if (!managed) return

		for (const pending of managed.pending.values()) {
			clearTimeout(pending.timer)
			pending.reject(new Error(`Skill ${skillId} process exited with code ${code}`))
		}
		managed.pending.clear()
		managed.ready = false

		if (managed.restartCount < MAX_RESTARTS) {
			managed.restartCount++
			this.spawn(skillId, managed.skillPath, manifest).catch(() => {
				this.processes.delete(skillId)
			})
		} else {
			this.processes.delete(skillId)
		}
	}

	private onProcessError(skillId: string, err: Error): void {
		const managed = this.processes.get(skillId)
		if (!managed) return

		for (const pending of managed.pending.values()) {
			clearTimeout(pending.timer)
			pending.reject(err)
		}
		managed.pending.clear()
	}
}
