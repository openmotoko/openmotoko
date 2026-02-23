import { exec } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { isAbsolute, normalize, resolve } from 'node:path'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

const BLOCKED_COMMANDS = [
	'rm -rf /',
	'rm -rf /*',
	'mkfs',
	'dd if=',
	':(){',
	'chmod -R 777 /',
	'chown -R',
	'> /dev/sda',
	'wget',
	'curl',
	'nc ',
	'ncat ',
	'netcat',
	'base64 -d',
	'python -c',
	'python3 -c',
	'node -e',
	'perl -e',
	'ruby -e',
	'eval ',
	'$(curl',
	'$(wget',
	'|bash',
	'|sh',
	'|zsh',
	'sudo ',
	'su ',
	'passwd',
	'useradd',
	'userdel',
	'groupadd',
	'crontab',
	'shutdown',
	'reboot',
	'init ',
	'systemctl',
	'launchctl',
	'pkill -9',
	'kill -9',
	'killall',
]

const BLOCKED_PATTERNS = [
	/>\s*\/dev\//,
	/\/etc\/(passwd|shadow|sudoers)/,
	/~\/\.ssh/,
	/\/\.gnupg/,
	/\.env/,
	/&&\s*rm\s/,
	/;\s*rm\s/,
	/\|\s*rm\s/,
]

const MAX_COMMAND_LENGTH = 2048
const MAX_BUFFER = 2 * 1024 * 1024
const MAX_TIMEOUT = 60_000

function isCommandBlocked(command: string): string | null {
	const lower = command.toLowerCase().trim()

	if (command.length > MAX_COMMAND_LENGTH) {
		return `Command exceeds maximum length of ${MAX_COMMAND_LENGTH} characters`
	}

	for (const blocked of BLOCKED_COMMANDS) {
		if (lower.includes(blocked)) {
			return `Command contains blocked pattern: "${blocked}"`
		}
	}

	for (const pattern of BLOCKED_PATTERNS) {
		if (pattern.test(command)) {
			return `Command matches a blocked pattern`
		}
	}

	return null
}

export const shellExecutor = defineSkill(manifest, async (toolName, args, ctx) => {
	if (toolName !== 'execute_command') {
		return { success: false, error: `Unknown tool: ${toolName}` }
	}

	if (!ctx.manifest.capabilities?.shell) {
		return { success: false, error: 'Shell capability not declared in manifest' }
	}

	const command = args.command as string
	const rawCwd = (args.cwd as string | undefined) ?? process.cwd()
	const timeout = Math.min((args.timeout as number | undefined) ?? 30_000, MAX_TIMEOUT)

	const blocked = isCommandBlocked(command)
	if (blocked) {
		return { success: false, error: `Blocked: ${blocked}` }
	}

	const cwd = isAbsolute(rawCwd) ? normalize(rawCwd) : resolve(process.cwd(), rawCwd)

	ctx.log(`Executing: ${command}`)

	const safeEnvKeys = ['PATH', 'HOME', 'LANG', 'TERM', 'SHELL'] as const
	const sandboxEnv: Record<string, string | undefined> = {}
	for (const key of safeEnvKeys) {
		sandboxEnv[key] = ctx.env[key]
	}

	return new Promise((resolve) => {
		exec(
			command,
			{
				cwd,
				timeout,
				maxBuffer: MAX_BUFFER,
				env: sandboxEnv,
			},
			(error, stdout, stderr) => {
				const truncatedStdout =
					stdout.length > MAX_BUFFER
						? `${stdout.slice(0, MAX_BUFFER)}\n[truncated]`
						: stdout.toString()
				const truncatedStderr =
					stderr.length > MAX_BUFFER
						? `${stderr.slice(0, MAX_BUFFER)}\n[truncated]`
						: stderr.toString()
				resolve({
					success: !error,
					data: {
						stdout: truncatedStdout,
						stderr: truncatedStderr,
						exitCode: error?.code ?? 0,
					},
					error: error?.message,
				})
			},
		)
	})
})
