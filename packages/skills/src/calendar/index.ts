import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

interface CalendarEvent {
	id: string
	title: string
	start: number
	end: number
	description?: string
	createdAt: number
}

const events = new Map<string, CalendarEvent>()

export const calendar = defineSkill(manifest, async (toolName, args, ctx) => {
	switch (toolName) {
		case 'list_events': {
			const startMs = new Date(args.start as string).getTime()
			const endMs = new Date(args.end as string).getTime()

			if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
				return { success: false, error: 'Invalid date format. Use ISO 8601.' }
			}

			ctx.log(`Listing events from ${args.start} to ${args.end}`)

			const matching = [...events.values()]
				.filter((e) => e.start >= startMs && e.start <= endMs)
				.sort((a, b) => a.start - b.start)
				.map((e) => ({
					...e,
					start: new Date(e.start).toISOString(),
					end: new Date(e.end).toISOString(),
					createdAt: new Date(e.createdAt).toISOString(),
				}))

			return { success: true, data: { events: matching, count: matching.length } }
		}

		case 'create_event': {
			const title = args.title as string
			const startMs = new Date(args.start as string).getTime()
			const endMs = new Date(args.end as string).getTime()
			const description = args.description as string | undefined

			if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
				return { success: false, error: 'Invalid date format. Use ISO 8601.' }
			}

			if (endMs <= startMs) {
				return { success: false, error: 'End time must be after start time.' }
			}

			ctx.log(`Creating event: ${title}`)

			const event: CalendarEvent = {
				id: randomUUID(),
				title,
				start: startMs,
				end: endMs,
				description,
				createdAt: Date.now(),
			}
			events.set(event.id, event)

			return {
				success: true,
				data: {
					...event,
					start: new Date(event.start).toISOString(),
					end: new Date(event.end).toISOString(),
					createdAt: new Date(event.createdAt).toISOString(),
				},
			}
		}

		default:
			return { success: false, error: `Unknown tool: ${toolName}` }
	}
})
