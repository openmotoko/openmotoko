import { Command } from 'commander'
import chalk from 'chalk'
import { apiRequest } from '../utils.js'

interface MessageResponse {
	id: string
	conversationId: string
	role: string
	content: string
	model: string
	provider: string
	usage: {
		inputTokens: number
		outputTokens: number
		cost: number
	}
}

interface ConversationResponse {
	id: string
	title: string
}

async function sendMessage(options: {
	message: string
	conversation?: string
	model?: string
}): Promise<void> {
	let conversationId = options.conversation

	if (!conversationId) {
		const conv = await apiRequest<ConversationResponse>(
			'/api/conversations',
			{
				method: 'POST',
				body: JSON.stringify({ title: 'CLI Session' }),
			},
		)
		conversationId = conv.id
		console.log(chalk.dim(`Conversation: ${conversationId}`))
	}

	const body: Record<string, string> = { content: options.message }
	if (options.model) {
		body.model = options.model
	}

	const response = await apiRequest<MessageResponse>(
		`/api/conversations/${conversationId}/messages`,
		{
			method: 'POST',
			body: JSON.stringify(body),
		},
	)

	console.log()
	console.log(chalk.cyan(`[${response.provider}/${response.model}]`))
	console.log(response.content)
	console.log()
	console.log(
		chalk.dim(
			`Tokens: ${response.usage.inputTokens + response.usage.outputTokens} | ` +
			`Cost: $${response.usage.cost.toFixed(6)}`,
		),
	)
}

export const agentCommand = new Command('agent')
	.description('Send messages to the agent')
	.requiredOption('-m, --message <text>', 'Message to send')
	.option('-c, --conversation <id>', 'Conversation ID')
	.option('--model <model>', 'Model alias to use')
	.action(async (options: { message: string; conversation?: string; model?: string }) => {
		try {
			await sendMessage(options)
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			console.error(chalk.red(`Error: ${msg}`))
			process.exitCode = 1
		}
	})
