import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { TailscaleNode, TailscaleStatus } from './types.js'

const execFileAsync = promisify(execFile)

function getTailscaleBin(): string {
	if (process.platform === 'darwin') {
		return '/Applications/Tailscale.app/Contents/MacOS/Tailscale'
	}
	return 'tailscale'
}

async function runTailscale(...args: string[]): Promise<string> {
	const bin = getTailscaleBin()
	const { stdout } = await execFileAsync(bin, args, { timeout: 10000 })
	return stdout.trim()
}

export async function detectTailscale(): Promise<TailscaleStatus> {
	const base: TailscaleStatus = {
		installed: false,
		running: false,
		version: null,
		hostname: null,
		magicDns: null,
		tailnetName: null,
		ipv4: null,
		ipv6: null,
		online: false,
	}

	try {
		const versionOutput = await runTailscale('version', '--json')
		const versionData = JSON.parse(versionOutput)
		base.installed = true
		base.version = versionData.majorMinorPatch ?? versionData.short ?? null
	} catch {
		return base
	}

	try {
		const statusOutput = await runTailscale('status', '--json')
		const status = JSON.parse(statusOutput)
		base.running = true
		base.online = status.BackendState === 'Running'

		if (status.Self) {
			base.hostname = status.Self.HostName ?? null
			base.magicDns = status.Self.DNSName?.replace(/\.$/, '') ?? null
			const addrs: string[] = status.Self.TailscaleIPs ?? []
			base.ipv4 = addrs.find((a: string) => a.includes('.')) ?? null
			base.ipv6 = addrs.find((a: string) => a.includes(':')) ?? null
		}

		if (status.MagicDNSSuffix) {
			base.tailnetName = status.MagicDNSSuffix.replace(/\.$/, '')
		}
	} catch {
		// tailscale installed but not running
	}

	return base
}

export async function getNodes(): Promise<TailscaleNode[]> {
	try {
		const output = await runTailscale('status', '--json')
		const status = JSON.parse(output)
		const peers: Record<string, unknown> = status.Peer ?? {}
		const nodes: TailscaleNode[] = []

		for (const [id, peer] of Object.entries(peers)) {
			const p = peer as Record<string, unknown>
			const addrs: string[] = (p.TailscaleIPs as string[]) ?? []
			nodes.push({
				id,
				hostname: (p.HostName as string) ?? '',
				dnsName: ((p.DNSName as string) ?? '').replace(/\.$/, ''),
				os: (p.OS as string) ?? '',
				online: (p.Online as boolean) ?? false,
				ipv4: addrs.find((a) => a.includes('.')) ?? null,
				ipv6: addrs.find((a) => a.includes(':')) ?? null,
				lastSeen: (p.LastSeen as string) ?? null,
			})
		}

		return nodes
	} catch {
		return []
	}
}
