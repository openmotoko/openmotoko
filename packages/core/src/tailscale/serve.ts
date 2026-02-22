import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { TailscaleServeConfig } from './types.js'

const execFileAsync = promisify(execFile)

function getTailscaleBin(): string {
	if (process.platform === 'darwin') {
		return '/Applications/Tailscale.app/Contents/MacOS/Tailscale'
	}
	return 'tailscale'
}

export async function getServeStatus(port = 3457): Promise<TailscaleServeConfig> {
	const base: TailscaleServeConfig = {
		serving: false,
		port,
		protocol: 'https',
		url: null,
	}

	try {
		const bin = getTailscaleBin()
		const { stdout } = await execFileAsync(bin, ['serve', 'status', '--json'], {
			timeout: 10000,
		})
		const status = JSON.parse(stdout.trim())

		const tcp = status?.TCP ?? status?.Web ?? {}
		for (const [key, val] of Object.entries(tcp)) {
			const config = val as Record<string, unknown>
			if (String(key).includes(String(port)) || JSON.stringify(config).includes(String(port))) {
				base.serving = true
				break
			}
		}

		if (base.serving && status?.Self?.DNSName) {
			const dnsName = (status.Self.DNSName as string).replace(/\.$/, '')
			base.url = `https://${dnsName}`
		}
	} catch {
		// serve not configured
	}

	return base
}

export async function startServe(port = 3457): Promise<void> {
	const bin = getTailscaleBin()
	await execFileAsync(bin, ['serve', '--bg', `http://localhost:${port}`], {
		timeout: 15000,
	})
}

export async function stopServe(port = 3457): Promise<void> {
	const bin = getTailscaleBin()
	await execFileAsync(bin, ['serve', '--bg', 'off', `http://localhost:${port}`], {
		timeout: 15000,
	})
}
