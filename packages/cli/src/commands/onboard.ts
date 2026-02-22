import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { Command } from 'commander'
import chalk from 'chalk'
import { apiRequest, writeConfig, readConfig } from '../utils.js'

const LLM_PROVIDERS = [
	{ key: 'anthropic', name: 'Anthropic', envKey: 'ANTHROPIC_API_KEY' },
	{ key: 'openai', name: 'OpenAI', envKey: 'OPENAI_API_KEY' },
	{ key: 'google', name: 'Google AI', envKey: 'GOOGLE_AI_API_KEY' },
	{ key: 'ollama', name: 'Ollama (local)', envKey: '' },
]

const MODEL_ALIASES: Record<string, Array<{ alias: string; label: string }>> = {
	anthropic: [
		{ alias: 'smart', label: 'Claude Sonnet (smart)' },
		{ alias: 'fast', label: 'Claude Haiku (fast)' },
	],
	openai: [
		{ alias: 'balanced', label: 'GPT-4o (balanced)' },
		{ alias: 'fast', label: 'GPT-4o-mini (fast)' },
	],
	google: [
		{ alias: 'smart', label: 'Gemini Pro (smart)' },
		{ alias: 'fast', label: 'Gemini Flash (fast)' },
	],
	ollama: [
		{ alias: 'smart', label: 'Default Ollama model' },
	],
}

const CHANNEL_TYPES = ['telegram', 'discord', 'whatsapp', 'signal', 'slack', 'imessage']

async function ask(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
	const answer = await rl.question(chalk.cyan(`  ${question} `))
	return answer.trim()
}

async function runOnboard(): Promise<void> {
	const rl = createInterface({ input: stdin, output: stdout })

	try {
		console.log()
		console.log(chalk.bold('OpenMotoko Setup'))
		console.log(chalk.dim('Configure your personal AI agent'))
		console.log()

		console.log(chalk.bold('1. LLM Provider'))
		console.log()
		for (let i = 0; i < LLM_PROVIDERS.length; i++) {
			console.log(`  ${chalk.cyan(String(i + 1))}. ${LLM_PROVIDERS[i].name}`)
		}
		console.log()

		const providerChoice = await ask(rl, 'Choose provider (1-4):')
		const providerIdx = parseInt(providerChoice, 10) - 1
		if (providerIdx < 0 || providerIdx >= LLM_PROVIDERS.length) {
			console.error(chalk.red('Invalid choice'))
			return
		}

		const provider = LLM_PROVIDERS[providerIdx]
		let apiKey = ''

		if (provider.envKey) {
			apiKey = await ask(rl, `${provider.name} API key:`)
			if (!apiKey) {
				console.error(chalk.red('API key is required'))
				return
			}
		}

		console.log()
		console.log(chalk.bold('2. Default Model'))
		console.log()

		const models = MODEL_ALIASES[provider.key] ?? []
		for (let i = 0; i < models.length; i++) {
			console.log(`  ${chalk.cyan(String(i + 1))}. ${models[i].label}`)
		}
		console.log()

		const modelChoice = await ask(rl, `Choose model (1-${models.length}):`)
		const modelIdx = parseInt(modelChoice, 10) - 1
		const defaultModel = models[modelIdx]?.alias ?? 'smart'

		console.log()
		console.log(chalk.bold('3. Channels'))
		console.log(chalk.dim('Which messaging channels do you want to enable?'))
		console.log()

		const enabledChannels: string[] = []

		for (const type of CHANNEL_TYPES) {
			const answer = await ask(rl, `Enable ${type}? (y/n):`)
			if (answer.toLowerCase() === 'y') {
				enabledChannels.push(type)
			}
		}

		console.log()
		console.log(chalk.bold('Saving configuration...'))

		const config = await readConfig()
		config.defaultProvider = provider.key
		config.defaultModel = defaultModel
		if (apiKey && provider.envKey) {
			config[provider.envKey] = apiKey
		}
		config.enabledChannels = enabledChannels
		await writeConfig(config)

		try {
			const settings: Record<string, unknown> = {
				defaultProvider: provider.key,
				defaultModel,
			}

			if (apiKey && provider.envKey) {
				settings[provider.envKey] = apiKey
			}

			await apiRequest('/api/settings', {
				method: 'PUT',
				body: JSON.stringify(settings),
			})

			console.log(chalk.green('Settings saved to API'))
		} catch {
			console.log(chalk.yellow('Gateway not running. Settings saved locally only.'))
		}

		console.log()
		console.log(chalk.green('Setup complete!'))
		console.log()
		console.log(chalk.dim('Next steps:'))
		console.log(chalk.dim('  openmotoko gateway start'))
		console.log(chalk.dim('  openmotoko agent -m "Hello"'))
		console.log(chalk.dim('  openmotoko doctor'))
	} finally {
		rl.close()
	}
}

export const onboardCommand = new Command('onboard')
	.description('Interactive setup wizard')
	.action(async () => {
		try {
			await runOnboard()
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			console.error(chalk.red(`Error: ${msg}`))
			process.exitCode = 1
		}
	})
