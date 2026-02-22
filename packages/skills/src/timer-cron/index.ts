import { readFile } from 'node:fs/promises'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'
import cron from 'node-cron'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

interface ActiveTimer {
	name: string
	type: 'timer' | 'schedule'
	callbackMessage: string
	firedCount: number
	createdAt: number
	handle: ReturnType<typeof setTimeout> | cron.ScheduledTask
}

const active = new Map<string, ActiveTimer>()

export const timerCron = defineSkill(manifest, async (toolName, args, ctx) => {
	switch (toolName) {
		case 'set_timer': {
			const name = args.name as string
			const seconds = args.seconds as number
			const callbackMessage = args.callback_message as string

			if (active.has(name)) {
				return { success: false, error: `Timer "${name}" already exists` }
			}

			ctx.log(`Setting timer "${name}" for ${seconds}s`)

			const entry: ActiveTimer = {
				name,
				type: 'timer',
				callbackMessage,
				firedCount: 0,
				createdAt: Date.now(),
				handle: setTimeout(() => {
					entry.firedCount++
					ctx.log(`Timer "${name}" fired: ${callbackMessage}`)
					active.delete(name)
				}, seconds * 1000),
			}
			active.set(name, entry)

			return {
				success: true,
				data: {
					name,
					type: 'timer',
					seconds,
					callbackMessage,
					firesAt: new Date(Date.now() + seconds * 1000).toISOString(),
				},
			}
		}

		case 'create_schedule': {
			const name = args.name as string
			const cronExpression = args.cron_expression as string
			const callbackMessage = args.callback_message as string

			if (active.has(name)) {
				return { success: false, error: `Schedule "${name}" already exists` }
			}

			if (!cron.validate(cronExpression)) {
				return { success: false, error: `Invalid cron expression: ${cronExpression}` }
			}

			ctx.log(`Creating schedule "${name}": ${cronExpression}`)

			const entry: ActiveTimer = {
				name,
				type: 'schedule',
				callbackMessage,
				firedCount: 0,
				createdAt: Date.now(),
				handle: cron.schedule(cronExpression, () => {
					entry.firedCount++
					ctx.log(`Schedule "${name}" tick #${entry.firedCount}: ${callbackMessage}`)
				}),
			}
			active.set(name, entry)

			return {
				success: true,
				data: {
					name,
					type: 'schedule',
					cronExpression,
					callbackMessage,
				},
			}
		}

		default:
			return { success: false, error: `Unknown tool: ${toolName}` }
	}
})
