import { desc, eq } from 'drizzle-orm'
import { getDb } from '../db/client.js'
import { conversations, messages } from '../db/schema.js'
import type { ToolDefinition } from '../llm/types.js'

export function getSessionToolDefinitions(): ToolDefinition[] {
	return [
		{
			name: 'sessions_list',
			description: 'List all active agent sessions with their status and channel info',
			inputSchema: {
				type: 'object',
				properties: {
					status: {
						type: 'string',
						enum: ['active', 'idle', 'all'],
						description: 'Filter by status',
					},
				},
			},
		},
		{
			name: 'sessions_history',
			description: 'Fetch the transcript/message history of a specific session',
			inputSchema: {
				type: 'object',
				properties: {
					sessionId: {
						type: 'string',
						description: 'The session/conversation ID to fetch history for',
					},
					limit: { type: 'number', description: 'Maximum number of messages to return' },
				},
				required: ['sessionId'],
			},
		},
		{
			name: 'sessions_send',
			description: 'Send a message to another active session. Optionally request a reply.',
			inputSchema: {
				type: 'object',
				properties: {
					sessionId: { type: 'string', description: 'Target session/conversation ID' },
					message: { type: 'string', description: 'Message content to send' },
					expectReply: { type: 'boolean', description: 'Whether to wait for a reply' },
				},
				required: ['sessionId', 'message'],
			},
		},
		{
			name: 'sessions_spawn',
			description: 'Create a new agent session for a subtask and optionally wait for its result',
			inputSchema: {
				type: 'object',
				properties: {
					task: { type: 'string', description: 'Task description for the new session' },
					model: { type: 'string', description: 'Model alias (fast/balanced/smart)' },
					waitForResult: {
						type: 'boolean',
						description: 'Whether to wait for the session to complete',
					},
				},
				required: ['task'],
			},
		},
	]
}

export async function executeSessionTool(
	toolName: string,
	input: Record<string, unknown>,
): Promise<string> {
	const db = getDb()

	switch (toolName) {
		case 'sessions_list': {
			const convs = db
				.select()
				.from(conversations)
				.orderBy(desc(conversations.updatedAt))
				.limit(20)
				.all()
			return JSON.stringify(
				convs.map((c) => ({
					id: c.id,
					title: c.title,
					channel: c.channelId,
					updatedAt: c.updatedAt,
				})),
			)
		}

		case 'sessions_history': {
			const sessionId = input.sessionId as string
			const limit = (input.limit as number) ?? 20
			const msgs = db
				.select()
				.from(messages)
				.where(eq(messages.conversationId, sessionId))
				.orderBy(desc(messages.createdAt))
				.limit(limit)
				.all()
				.reverse()
			return JSON.stringify(
				msgs.map((m) => ({ role: m.role, content: m.content, createdAt: m.createdAt })),
			)
		}

		case 'sessions_send': {
			const sessionId = input.sessionId as string
			const message = input.message as string
			db.insert(messages)
				.values({
					conversationId: sessionId,
					role: 'user',
					content: message,
					tokens: 0,
					cost: 0,
				})
				.run()
			return JSON.stringify({ success: true, sessionId })
		}

		case 'sessions_spawn': {
			const task = input.task as string
			const [conv] = db
				.insert(conversations)
				.values({ title: task.slice(0, 100) })
				.returning()
				.all()
			db.insert(messages)
				.values({
					conversationId: conv.id,
					role: 'user',
					content: task,
					tokens: 0,
					cost: 0,
				})
				.run()
			return JSON.stringify({ success: true, sessionId: conv.id })
		}

		default:
			return JSON.stringify({ error: `Unknown session tool: ${toolName}` })
	}
}
