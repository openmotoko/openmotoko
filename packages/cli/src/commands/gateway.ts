import { spawn } from 'node:child_process'
import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Command } from 'commander'
import chalk from 'chalk'
import { getApiUrl, getPidFilePath, getConfigDir } from '../utils.js'

async function readPid(): Promise<number | null> {
	try {
		const raw = await readFile(getPidFilePath(), 'utf-8')
		const pid = parseInt(raw.trim(), 10)
		return Number.isNaN(pid) ? null : pid
	} catch {
		return null
	}
}

function isProcessRunning(pid: number): boolean {
	try {
		process.kill(pid, 0)
		return true
	} catch {
		return false
	}
}

async function startGateway(): Promise<void> {
	const existingPid = await readPid()
	if (existingPid && isProcessRunning(existingPid)) {
		console.log(chalk.yellow(`Gateway already running (PID ${existingPid})`))
		return
	}

	const apiEntry = resolve(
		import.meta.dirname,
		'..', '..', '..', 'api', 'dist', 'index.js',
	)

	const child = spawn('node', [apiEntry], {
		detached: true,
		stdio: 'ignore',
		env: { ...process.env },
	})

	child.unref()

	if (!child.pid) {
		console.log(chalk.red('Failed to start gateway process'))
		process.exitCode = 1
		return
	}

	await mkdir(getConfigDir(), { recursive: true })
	await writeFile(getPidFilePath(), String(child.pid), 'utf-8')

	console.log(chalk.green(`Gateway started (PID ${child.pid})`))
	console.log(chalk.dim(`API: ${getApiUrl()}`))
}

async function stopGateway(): Promise<void> {
	const pid = await readPid()

	if (!pid) {
		console.log(chalk.yellow('No gateway PID file found'))
		return
	}

	if (!isProcessRunning(pid)) {
		console.log(chalk.yellow(`Gateway process (PID ${pid}) is not running`))
		await unlink(getPidFilePath()).catch(() => {})
		return
	}

	try {
		process.kill(pid, 'SIGTERM')
		console.log(chalk.green(`Sent SIGTERM to gateway (PID ${pid})`))
		await unlink(getPidFilePath()).catch(() => {})
	} catch {
		console.log(chalk.red(`Failed to stop gateway (PID ${pid})`))
		process.exitCode = 1
	}
}

async function statusGateway(): Promise<void> {
	const pid = await readPid()

	if (!pid) {
		console.log(chalk.dim('Gateway is not running (no PID file)'))
		return
	}

	if (!isProcessRunning(pid)) {
		console.log(chalk.yellow(`Gateway PID file exists (${pid}) but process is not running`))
		return
	}

	console.log(chalk.green(`Gateway is running (PID ${pid})`))

	try {
		const response = await fetch(`${getApiUrl()}/api/health`)
		if (response.ok) {
			const data = (await response.json()) as { uptime: number }
			console.log(chalk.dim(`Uptime: ${Math.floor(data.uptime)}s`))
		}
	} catch {
		console.log(chalk.yellow('Gateway process running but API not reachable'))
	}
}

export const gatewayCommand = new Command('gateway')
	.description('Manage the OpenMotoko API gateway')
	.addCommand(
		new Command('start')
			.description('Start the API gateway')
			.action(startGateway),
	)
	.addCommand(
		new Command('stop')
			.description('Stop the API gateway')
			.action(stopGateway),
	)
	.addCommand(
		new Command('status')
			.description('Check gateway status')
			.action(statusGateway),
	)
