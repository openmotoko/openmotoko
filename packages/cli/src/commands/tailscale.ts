import chalk from 'chalk'
import { Command } from 'commander'
import ora from 'ora'

const API_BASE = `http://localhost:${process.env.OPENMOTOKO_PORT ?? 3457}`

async function apiGet(path: string) {
	const res = await fetch(`${API_BASE}${path}`)
	return res.json()
}

async function apiPost(path: string) {
	const res = await fetch(`${API_BASE}${path}`, { method: 'POST' })
	return res.json()
}

export function tailscaleCommand() {
	const cmd = new Command('tailscale').description('Manage Tailscale integration')

	cmd
		.command('status')
		.description('Show Tailscale connection status')
		.action(async () => {
			const spinner = ora('Checking Tailscale...').start()
			try {
				const data = await apiGet('/api/tailscale/status')
				spinner.stop()

				if (!data.installed) {
					console.log(chalk.yellow('Tailscale is not installed'))
					return
				}

				console.log(chalk.cyan('Tailscale Status'))
				console.log(`  Installed: ${chalk.green('yes')}`)
				console.log(`  Running:   ${data.running ? chalk.green('yes') : chalk.red('no')}`)
				console.log(`  Online:    ${data.online ? chalk.green('yes') : chalk.red('no')}`)
				if (data.hostname) console.log(`  Hostname:  ${chalk.white(data.hostname)}`)
				if (data.magicDns) console.log(`  MagicDNS:  ${chalk.cyan(data.magicDns)}`)
				if (data.ipv4) console.log(`  IPv4:      ${chalk.white(data.ipv4)}`)
				if (data.version) console.log(`  Version:   ${chalk.gray(data.version)}`)
				console.log()
				console.log(chalk.cyan('Serve'))
				console.log(`  Active:    ${data.serve?.serving ? chalk.green('yes') : chalk.gray('no')}`)
				if (data.serve?.url) console.log(`  URL:       ${chalk.green(data.serve.url)}`)
			} catch {
				spinner.fail('Could not reach OpenMotoko API')
			}
		})

	cmd
		.command('serve-start')
		.description('Start Tailscale Serve for remote access')
		.action(async () => {
			const spinner = ora('Starting Tailscale Serve...').start()
			try {
				const data = await apiPost('/api/tailscale/serve/start')
				if (data.success) {
					spinner.succeed(`Tailscale Serve started${data.serve?.url ? `: ${data.serve.url}` : ''}`)
				} else {
					spinner.fail(data.error ?? 'Failed to start')
				}
			} catch {
				spinner.fail('Could not reach OpenMotoko API')
			}
		})

	cmd
		.command('serve-stop')
		.description('Stop Tailscale Serve')
		.action(async () => {
			const spinner = ora('Stopping Tailscale Serve...').start()
			try {
				const data = await apiPost('/api/tailscale/serve/stop')
				if (data.success) {
					spinner.succeed('Tailscale Serve stopped')
				} else {
					spinner.fail(data.error ?? 'Failed to stop')
				}
			} catch {
				spinner.fail('Could not reach OpenMotoko API')
			}
		})

	cmd
		.command('nodes')
		.description('List Tailscale network nodes')
		.action(async () => {
			const spinner = ora('Fetching nodes...').start()
			try {
				const nodes = await apiGet('/api/tailscale/nodes')
				spinner.stop()

				if (!Array.isArray(nodes) || nodes.length === 0) {
					console.log(chalk.gray('No nodes found'))
					return
				}

				console.log(chalk.cyan(`${nodes.length} node(s) on your tailnet:\n`))
				for (const node of nodes) {
					const status = node.online ? chalk.green('online') : chalk.gray('offline')
					console.log(`  ${chalk.white(node.hostname)} (${node.os}) - ${status}`)
					if (node.ipv4) console.log(`    ${chalk.gray(node.ipv4)}`)
				}
			} catch {
				spinner.fail('Could not reach OpenMotoko API')
			}
		})

	return cmd
}
