import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { getApiUrl, getDbPath, getConfigDir } from '../utils.js'

interface HealthResponse {
	status: string
	uptime: number
}

interface ChannelInfo {
	id: string
	type: string
	enabled: boolean
}

interface SkillInfo {
	id: string
	name: string
	enabled: number
}

function pass(label: string, detail?: string): void {
	const suffix = detail ? chalk.dim(` (${detail})`) : ''
	console.log(`  ${chalk.green('\u2713')} ${label}${suffix}`)
}

function fail(label: string, detail?: string): void {
	const suffix = detail ? chalk.dim(` (${detail})`) : ''
	console.log(`  ${chalk.red('\u2717')} ${label}${suffix}`)
}

async function runDoctor(): Promise<void> {
	console.log()
	console.log(chalk.bold('OpenMotoko Doctor'))
	console.log()

	const spinner = ora({ text: 'Running checks...', color: 'cyan' }).start()

	let hasFailure = false

	spinner.text = 'Checking Node.js version...'
	const nodeVersion = process.version
	const major = parseInt(nodeVersion.slice(1), 10)
	spinner.stop()
	if (major >= 20) {
		pass('Node.js', nodeVersion)
	} else {
		fail('Node.js', `${nodeVersion} (requires >= 20)`)
		hasFailure = true
	}

	spinner.start('Checking API gateway...')
	try {
		const response = await fetch(`${getApiUrl()}/api/health`, {
			signal: AbortSignal.timeout(5000),
		})
		if (response.ok) {
			const data = (await response.json()) as HealthResponse
			spinner.stop()
			pass('API gateway', `uptime ${Math.floor(data.uptime)}s`)
		} else {
			spinner.stop()
			fail('API gateway', `HTTP ${response.status}`)
			hasFailure = true
		}
	} catch {
		spinner.stop()
		fail('API gateway', 'not reachable')
		hasFailure = true
	}

	spinner.start('Checking database...')
	const dbPath = getDbPath()
	try {
		await access(dbPath)
		spinner.stop()
		pass('Database', dbPath)
	} catch {
		spinner.stop()
		fail('Database', `not found at ${dbPath}`)
		hasFailure = true
	}

	spinner.start('Checking config file...')
	const configPath = join(getConfigDir(), 'openmotoko.json')
	let configHasProviders = false
	try {
		await access(configPath)
		spinner.stop()
		pass('Config file', configPath)

		try {
			const raw = await readFile(configPath, 'utf-8')
			const parsed = JSON.parse(raw)
			const { openMotokoConfigSchema } = await import('@openmotoko/core')
			openMotokoConfigSchema.parse(parsed)
			pass('Config schema', 'valid')

			if (parsed.llm?.providers?.length > 0) {
				configHasProviders = true
			}
		} catch {
			fail('Config schema', 'invalid or unparseable')
			hasFailure = true
		}
	} catch {
		spinner.stop()
		fail('Config file', `not found at ${configPath}`)
		hasFailure = true
	}

	spinner.start('Checking LLM providers...')
	spinner.stop()
	const providers: Array<{ name: string; envKey: string }> = [
		{ name: 'Anthropic', envKey: 'ANTHROPIC_API_KEY' },
		{ name: 'OpenAI', envKey: 'OPENAI_API_KEY' },
		{ name: 'Google AI', envKey: 'GOOGLE_AI_API_KEY' },
	]

	let anyProvider = configHasProviders
	if (configHasProviders) {
		pass('LLM config', 'providers configured')
	}

	for (const provider of providers) {
		if (process.env[provider.envKey]) {
			pass(`${provider.name}`, 'API key set')
			anyProvider = true
		} else {
			console.log(`  ${chalk.yellow('-')} ${provider.name} ${chalk.dim('(no API key)')}`)
		}
	}

	const ollamaHost = process.env.OLLAMA_HOST ?? 'http://localhost:11434'
	try {
		const ollamaResp = await fetch(`${ollamaHost}/api/tags`, {
			signal: AbortSignal.timeout(3000),
		})
		if (ollamaResp.ok) {
			pass('Ollama', ollamaHost)
			anyProvider = true
		} else {
			console.log(`  ${chalk.yellow('-')} Ollama ${chalk.dim('(not responding)')}`)
		}
	} catch {
		console.log(`  ${chalk.yellow('-')} Ollama ${chalk.dim('(not reachable)')}`)
	}

	if (!anyProvider) {
		fail('LLM providers', 'no provider available')
		hasFailure = true
	}

	spinner.start('Checking skills...')
	try {
		const skills = await fetch(`${getApiUrl()}/api/skills`, {
			signal: AbortSignal.timeout(5000),
		})
		if (skills.ok) {
			const data = (await skills.json()) as SkillInfo[]
			const active = data.filter((s) => s.enabled === 1)
			spinner.stop()
			pass('Skills', `${active.length} active / ${data.length} total`)
		} else {
			spinner.stop()
			console.log(`  ${chalk.yellow('-')} Skills ${chalk.dim('(API not available)')}`)
		}
	} catch {
		spinner.stop()
		console.log(`  ${chalk.yellow('-')} Skills ${chalk.dim('(gateway not running)')}`)
	}

	spinner.start('Checking channels...')
	try {
		const chResp = await fetch(`${getApiUrl()}/api/channels`, {
			signal: AbortSignal.timeout(5000),
		})
		if (chResp.ok) {
			const channels = (await chResp.json()) as ChannelInfo[]
			const enabled = channels.filter((c) => c.enabled)
			spinner.stop()
			pass('Channels', `${enabled.length} enabled / ${channels.length} total`)
		} else {
			spinner.stop()
			console.log(`  ${chalk.yellow('-')} Channels ${chalk.dim('(API not available)')}`)
		}
	} catch {
		spinner.stop()
		console.log(`  ${chalk.yellow('-')} Channels ${chalk.dim('(gateway not running)')}`)
	}

	console.log()
	if (hasFailure) {
		console.log(chalk.yellow('Some checks failed. Run the gateway and configure missing items.'))
		process.exitCode = 1
	} else {
		console.log(chalk.green('All checks passed.'))
	}
}

export const doctorCommand = new Command('doctor')
	.description('Diagnose your OpenMotoko setup')
	.action(async () => {
		try {
			await runDoctor()
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			console.error(chalk.red(`Error: ${msg}`))
			process.exitCode = 1
		}
	})
