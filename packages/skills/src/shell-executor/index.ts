import { exec } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

export const shellExecutor = defineSkill(manifest, async (toolName, args, ctx) => {
	if (toolName !== 'execute_command') {
		return { success: false, error: `Unknown tool: ${toolName}` }
	}

	const command = args.command as string
	const cwd = (args.cwd as string | undefined) ?? process.cwd()
	const timeout = (args.timeout as number | undefined) ?? 30_000

	ctx.log(`Executing: ${command}`)

	return new Promise((resolve) => {
		exec(command, { cwd, timeout, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
			resolve({
				success: !error,
				data: {
					stdout: stdout.toString(),
					stderr: stderr.toString(),
					exitCode: error?.code ?? 0,
				},
				error: error?.message,
			})
		})
	})
})
