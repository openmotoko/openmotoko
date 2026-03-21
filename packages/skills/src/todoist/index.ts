import { readFile } from 'node:fs/promises'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

const TODOIST_API_BASE = 'https://api.todoist.com/rest/v2'

function getApiKey(env: Record<string, string | undefined>): string {
	const key = env.TODOIST_API_KEY
	if (!key) {
		throw new Error('TODOIST_API_KEY environment variable is required')
	}
	return key
}

async function todoistFetch(
	env: Record<string, string | undefined>,
	path: string,
	options?: RequestInit,
): Promise<unknown> {
	const apiKey = getApiKey(env)
	const response = await fetch(`${TODOIST_API_BASE}${path}`, {
		...options,
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			...options?.headers,
		},
	})

	if (response.status === 204) {
		return { success: true }
	}

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`Todoist API error: ${response.status} ${text}`)
	}

	return response.json()
}

interface TodoistTask {
	id: string
	content: string
	description: string
	is_completed: boolean
	priority: number
	due: { date: string; string: string; datetime?: string } | null
	project_id: string
	labels: string[]
	created_at: string
	url: string
}

interface TodoistProject {
	id: string
	name: string
	color: string
	is_favorite: boolean
	is_inbox_project: boolean
	order: number
	url: string
}

function formatTask(task: TodoistTask): Record<string, unknown> {
	return {
		id: task.id,
		content: task.content,
		description: task.description,
		priority: task.priority,
		due: task.due
			? {
					date: task.due.date,
					label: task.due.string,
					datetime: task.due.datetime,
				}
			: null,
		projectId: task.project_id,
		labels: task.labels,
		createdAt: task.created_at,
		url: task.url,
	}
}

export const todoist = defineSkill(manifest, async (toolName, args, ctx) => {
	switch (toolName) {
		case 'list_tasks': {
			const projectId = args.project_id as string | undefined
			const filter = args.filter as string | undefined
			ctx.log(
				`Listing tasks${projectId ? ` for project ${projectId}` : ''}${filter ? ` with filter: ${filter}` : ''}`,
			)

			try {
				const params = new URLSearchParams()
				if (projectId) params.set('project_id', projectId)
				if (filter) params.set('filter', filter)

				const query = params.toString()
				const data = (await todoistFetch(
					ctx.env,
					`/tasks${query ? `?${query}` : ''}`,
				)) as TodoistTask[]
				const tasks = data.map(formatTask)
				return { success: true, data: { tasks, count: tasks.length } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'create_task': {
			const content = args.content as string
			const description = args.description as string | undefined
			const dueDate = args.due_date as string | undefined
			const priority = args.priority as number | undefined
			const projectId = args.project_id as string | undefined
			ctx.log(`Creating task: ${content}`)

			try {
				const body: Record<string, unknown> = { content }
				if (description) body.description = description
				if (dueDate) body.due_string = dueDate
				if (priority) body.priority = priority
				if (projectId) body.project_id = projectId

				const data = (await todoistFetch(ctx.env, '/tasks', {
					method: 'POST',
					body: JSON.stringify(body),
				})) as TodoistTask
				return { success: true, data: formatTask(data) }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'complete_task': {
			const taskId = args.task_id as string
			ctx.log(`Completing task: ${taskId}`)

			try {
				await todoistFetch(ctx.env, `/tasks/${taskId}/close`, { method: 'POST' })
				return { success: true, data: { taskId, message: 'Task completed' } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'update_task': {
			const taskId = args.task_id as string
			const content = args.content as string | undefined
			const dueDate = args.due_date as string | undefined
			const priority = args.priority as number | undefined
			ctx.log(`Updating task: ${taskId}`)

			try {
				const body: Record<string, unknown> = {}
				if (content) body.content = content
				if (dueDate) body.due_string = dueDate
				if (priority) body.priority = priority

				const data = (await todoistFetch(ctx.env, `/tasks/${taskId}`, {
					method: 'POST',
					body: JSON.stringify(body),
				})) as TodoistTask
				return { success: true, data: formatTask(data) }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'list_projects': {
			ctx.log('Listing projects')

			try {
				const data = (await todoistFetch(ctx.env, '/projects')) as TodoistProject[]
				const projects = data.map((p) => ({
					id: p.id,
					name: p.name,
					color: p.color,
					isFavorite: p.is_favorite,
					isInbox: p.is_inbox_project,
					url: p.url,
				}))
				return { success: true, data: { projects, count: projects.length } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		default:
			return { success: false, error: `Unknown tool: ${toolName}` }
	}
})
