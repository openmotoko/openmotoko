import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

const execFileAsync = promisify(execFile)
const MAX_TIMEOUT = 30_000

async function runCode(
	code: string,
	extension: string,
	command: string,
	commandArgs: string[],
	timeoutMs: number,
): Promise<{ stdout: string; stderr: string; exit_code: number; error?: string }> {
	const filename = `openmotoko-run-${randomBytes(8).toString('hex')}${extension}`
	const filepath = join(tmpdir(), filename)
	const timeout = Math.min(Math.max(timeoutMs, 1000), MAX_TIMEOUT)

	try {
		await writeFile(filepath, code, 'utf-8')

		const { stdout, stderr } = await execFileAsync(command, [...commandArgs, filepath], {
			timeout,
			env: {},
			maxBuffer: 1024 * 1024,
		})

		return { stdout, stderr, exit_code: 0 }
	} catch (err) {
		const error = err as Error & {
			stdout?: string
			stderr?: string
			killed?: boolean
			code?: string | number
		}

		if (error.killed) {
			return {
				stdout: error.stdout ?? '',
				stderr: error.stderr ?? '',
				exit_code: 1,
				error: 'Execution timed out',
			}
		}

		return {
			stdout: error.stdout ?? '',
			stderr: error.stderr ?? '',
			exit_code: 1,
			error: error.message,
		}
	} finally {
		await unlink(filepath).catch(() => {})
	}
}

export const codeRunner = defineSkill(manifest, async (toolName, args, ctx) => {
	switch (toolName) {
		case 'run_javascript': {
			const code = args.code as string
			const timeout = (args.timeout as number | undefined) ?? 10_000
			ctx.log(`Running JavaScript snippet (${code.length} chars, timeout: ${timeout}ms)`)

			const result = await runCode(
				code,
				'.mjs',
				'node',
				['--no-warnings', '--experimental-vm-modules'],
				timeout,
			)

			return {
				success: result.exit_code === 0,
				data: result,
			}
		}

		case 'run_typescript': {
			const code = args.code as string
			const timeout = (args.timeout as number | undefined) ?? 10_000
			ctx.log(`Running TypeScript snippet (${code.length} chars, timeout: ${timeout}ms)`)

			const result = await runCode(code, '.mts', 'npx', ['tsx'], timeout)

			return {
				success: result.exit_code === 0,
				data: result,
			}
		}

		default:
			return { success: false, error: `Unknown tool: ${toolName}` }
	}
})
