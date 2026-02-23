import { getConfig } from '../config/index.js'
import { DockerSandbox } from './docker.js'

let instance: SandboxManager | null = null

export class SandboxManager {
	private sandbox: DockerSandbox
	private available: boolean | null = null

	constructor() {
		this.sandbox = new DockerSandbox()
	}

	async isAvailable(): Promise<boolean> {
		if (this.available !== null) return this.available
		this.available = await this.sandbox.isAvailable()
		return this.available
	}

	shouldSandbox(sessionType: 'main' | 'group' | 'channel' | 'sub-agent'): boolean {
		const config = getConfig()
		const mode = config.agents.sandbox.mode

		if (mode === 'off') return false
		if (mode === 'all') return true
		return sessionType !== 'main'
	}

	async executeInSandbox(
		command: string[],
		env?: Record<string, string>,
	): Promise<{ exitCode: number; stdout: string; stderr: string }> {
		const config = getConfig()
		const sandboxConfig = config.agents.sandbox

		return this.sandbox.execute({
			image: sandboxConfig.image,
			command,
			env,
			networkPolicy: sandboxConfig.networkPolicy,
		})
	}

	async executeScript(
		script: string,
		env?: Record<string, string>,
	): Promise<{ exitCode: number; stdout: string; stderr: string }> {
		const config = getConfig()
		const sandboxConfig = config.agents.sandbox

		return this.sandbox.executeScript(sandboxConfig.image, script, {
			env,
			networkPolicy: sandboxConfig.networkPolicy,
		})
	}

	getSandbox(): DockerSandbox {
		return this.sandbox
	}
}

export function getSandboxManager(): SandboxManager {
	if (!instance) {
		instance = new SandboxManager()
	}
	return instance
}
