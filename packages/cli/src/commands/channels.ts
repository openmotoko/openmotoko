import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { Command } from 'commander'
import chalk from 'chalk'
import { apiRequest, formatTable } from '../utils.js'

interface ChannelInfo {
	id: string
	type: string
	config: Record<string, unknown> | null
	enabled: boolean
	createdAt: number
}

const CHANNEL_FIELDS: Record<string, string[]> = {
	telegram: ['botToken'],
	whatsapp: ['phoneNumber'],
	discord: ['botToken', 'guildId'],
	signal: ['phoneNumber'],
	slack: ['botToken', 'appToken'],
	imessage: ['host', 'password'],
}

async function listChannels(): Promise<void> {
	const channels = await apiRequest<ChannelInfo[]>('/api/channels')

	if (channels.length === 0) {
		console.log(chalk.dim('No channels configured'))
		return
	}

	const header = ['TYPE', 'ID', 'ENABLED', 'CREATED']
	const rows = channels.map((ch) => [
		ch.type,
		ch.id,
		ch.enabled ? chalk.green('yes') : chalk.red('no'),
		new Date(ch.createdAt).toLocaleDateString(),
	])

	console.log(chalk.bold(formatTable([header])))
	console.log(formatTable(rows))
}

async function loginChannel(type: string): Promise<void> {
	const fields = CHANNEL_FIELDS[type]
	if (!fields) {
		const supported = Object.keys(CHANNEL_FIELDS).join(', ')
		console.error(chalk.red(`Unknown channel type: ${type}`))
		console.log(chalk.dim(`Supported: ${supported}`))
		process.exitCode = 1
		return
	}

	const rl = createInterface({ input: stdin, output: stdout })
	const config: Record<string, string> = {}

	try {
		console.log(chalk.bold(`Setup ${type} channel`))
		console.log()

		for (const field of fields) {
			const value = await rl.question(chalk.cyan(`  ${field}: `))
			if (!value.trim()) {
				console.error(chalk.red(`  ${field} is required`))
				process.exitCode = 1
				return
			}
			config[field] = value.trim()
		}
	} finally {
		rl.close()
	}

	const channels = await apiRequest<ChannelInfo[]>('/api/channels')
	const existing = channels.find((ch) => ch.type === type)

	if (existing) {
		await apiRequest(`/api/channels/${existing.id}`, {
			method: 'PUT',
			body: JSON.stringify({ config, enabled: true }),
		})
		console.log(chalk.green(`Updated ${type} channel`))
	} else {
		console.log(chalk.yellow(`Channel type "${type}" not registered in database yet.`))
		console.log(chalk.dim('Start the gateway to auto-register channel types.'))
	}
}

async function testChannel(type: string): Promise<void> {
	const channels = await apiRequest<ChannelInfo[]>('/api/channels')
	const channel = channels.find((ch) => ch.type === type)

	if (!channel) {
		console.error(chalk.red(`No ${type} channel configured`))
		process.exitCode = 1
		return
	}

	if (!channel.enabled) {
		console.error(chalk.yellow(`${type} channel is disabled`))
		process.exitCode = 1
		return
	}

	console.log(chalk.dim(`Testing ${type} channel (${channel.id})...`))

	try {
		await apiRequest<{ status: string }>('/api/health')
		console.log(chalk.green(`${type} channel configuration looks valid`))
		console.log(chalk.dim('Full connectivity test requires a running gateway'))
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		console.error(chalk.red(`Test failed: ${msg}`))
		process.exitCode = 1
	}
}

export const channelsCommand = new Command('channels')
	.description('Manage messaging channels')
	.addCommand(
		new Command('list')
			.description('List configured channels')
			.action(async () => {
				try {
					await listChannels()
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err)
					console.error(chalk.red(`Error: ${msg}`))
					process.exitCode = 1
				}
			}),
	)
	.addCommand(
		new Command('login')
			.description('Interactive channel setup')
			.argument('<type>', 'Channel type (telegram, discord, whatsapp, signal, slack, imessage)')
			.action(async (type: string) => {
				try {
					await loginChannel(type)
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err)
					console.error(chalk.red(`Error: ${msg}`))
					process.exitCode = 1
				}
			}),
	)
	.addCommand(
		new Command('test')
			.description('Test a channel connection')
			.argument('<type>', 'Channel type to test')
			.action(async (type: string) => {
				try {
					await testChannel(type)
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err)
					console.error(chalk.red(`Error: ${msg}`))
					process.exitCode = 1
				}
			}),
	)
