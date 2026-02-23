import { Readable } from 'node:stream'
import Docker from 'dockerode'

interface SandboxOptions {
	image: string
	command: string[]
	env?: Record<string, string>
	workDir?: string
	networkPolicy?: 'none' | 'restricted' | 'full'
	timeout?: number
	memoryLimit?: number
	cpuQuota?: number
}

interface SandboxResult {
	exitCode: number
	stdout: string
	stderr: string
	timedOut: boolean
}

export class DockerSandbox {
	private docker: Docker

	constructor(socketPath?: string) {
		this.docker = new Docker(socketPath ? { socketPath } : undefined)
	}

	async isAvailable(): Promise<boolean> {
		try {
			await this.docker.ping()
			return true
		} catch {
			return false
		}
	}

	async ensureImage(image: string): Promise<void> {
		try {
			await this.docker.getImage(image).inspect()
		} catch {
			const stream = await this.docker.pull(image)
			await new Promise<void>((resolve, reject) => {
				this.docker.modem.followProgress(stream, (err: Error | null) => {
					if (err) reject(err)
					else resolve()
				})
			})
		}
	}

	async execute(options: SandboxOptions): Promise<SandboxResult> {
		const {
			image,
			command,
			env = {},
			workDir = '/workspace',
			networkPolicy = 'restricted',
			timeout = 30_000,
			memoryLimit = 256 * 1024 * 1024,
			cpuQuota = 50_000,
		} = options

		await this.ensureImage(image)

		const disableNetwork = networkPolicy !== 'full'
		const networkMode = disableNetwork ? 'none' : 'bridge'

		const container = await this.docker.createContainer({
			Image: image,
			Cmd: command,
			Env: Object.entries(env).map(([k, v]) => `${k}=${v}`),
			WorkingDir: workDir,
			NetworkDisabled: disableNetwork,
			HostConfig: {
				NetworkMode: networkMode,
				Memory: memoryLimit,
				CpuQuota: cpuQuota,
				CpuPeriod: 100_000,
				ReadonlyRootfs: true,
				Tmpfs: { [workDir]: 'rw,noexec,nosuid,size=64m' },
				SecurityOpt: ['no-new-privileges:true'],
				CapDrop: ['ALL'],
				PidsLimit: 256,
				AutoRemove: true,
				Ulimits: [
					{ Name: 'nofile', Soft: 1024, Hard: 2048 },
					{ Name: 'nproc', Soft: 128, Hard: 256 },
				],
			},
			AttachStdout: true,
			AttachStderr: true,
			Tty: false,
		})

		let timedOut = false

		const timeoutId = setTimeout(async () => {
			timedOut = true
			try {
				await container.kill()
			} catch {}
		}, timeout)

		try {
			const stream = await container.attach({ stream: true, stdout: true, stderr: true })

			const stdoutChunks: Buffer[] = []
			const stderrChunks: Buffer[] = []
			const stdoutStream = new Readable({ read() {} })
			const stderrStream = new Readable({ read() {} })

			container.modem.demuxStream(stream, stdoutStream, stderrStream)

			stdoutStream.on('data', (chunk: Buffer) => stdoutChunks.push(chunk))
			stderrStream.on('data', (chunk: Buffer) => stderrChunks.push(chunk))

			await container.start()

			const { StatusCode } = await container.wait()

			const stdout = Buffer.concat(stdoutChunks).toString('utf-8')
			const stderr = Buffer.concat(stderrChunks).toString('utf-8')

			return {
				exitCode: StatusCode ?? 1,
				stdout,
				stderr,
				timedOut,
			}
		} finally {
			clearTimeout(timeoutId)
			try {
				await container.remove({ force: true })
			} catch {}
		}
	}

	async executeScript(
		image: string,
		script: string,
		options?: Partial<SandboxOptions>,
	): Promise<SandboxResult> {
		return this.execute({
			image,
			command: ['node', '-e', script],
			...options,
		})
	}
}
