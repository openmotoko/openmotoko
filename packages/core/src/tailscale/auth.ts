import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { TailscaleIdentity } from './types.js'

const execFileAsync = promisify(execFile)

function getTailscaleBin(): string {
	if (process.platform === 'darwin') {
		return '/Applications/Tailscale.app/Contents/MacOS/Tailscale'
	}
	return 'tailscale'
}

export async function whoIs(remoteAddr: string): Promise<TailscaleIdentity | null> {
	try {
		const bin = getTailscaleBin()
		const { stdout } = await execFileAsync(bin, ['whois', '--json', remoteAddr], {
			timeout: 5000,
		})
		const data = JSON.parse(stdout.trim())

		if (!data.UserProfile) {
			return null
		}

		return {
			loginName: data.UserProfile.LoginName ?? '',
			displayName: data.UserProfile.DisplayName ?? '',
			profilePicUrl: data.UserProfile.ProfilePicURL ?? null,
			tailnetName: data.Node?.ComputedName ?? '',
		}
	} catch {
		return null
	}
}

export function extractTailscaleHeaders(headers: Record<string, string | undefined>): {
	userLogin: string | null
	userName: string | null
} {
	return {
		userLogin: headers['tailscale-user-login'] ?? null,
		userName: headers['tailscale-user-name'] ?? null,
	}
}
