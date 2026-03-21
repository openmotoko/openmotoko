import { readFile } from 'node:fs/promises'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

interface TokenCache {
	accessToken: string
	expiresAt: number
}

let tokenCache: TokenCache | null = null

async function getAccessToken(env: Record<string, string | undefined>): Promise<string> {
	const clientId = env.GMAIL_CLIENT_ID
	const clientSecret = env.GMAIL_CLIENT_SECRET
	const refreshToken = env.GMAIL_REFRESH_TOKEN

	if (!clientId || !clientSecret || !refreshToken) {
		throw new Error('GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN are required')
	}

	if (tokenCache && Date.now() < tokenCache.expiresAt) {
		return tokenCache.accessToken
	}

	const response = await fetch(TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			refresh_token: refreshToken,
			grant_type: 'refresh_token',
		}),
	})

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`OAuth2 token refresh failed: ${response.status} ${text}`)
	}

	const data = (await response.json()) as { access_token: string; expires_in: number }
	tokenCache = {
		accessToken: data.access_token,
		expiresAt: Date.now() + (data.expires_in - 60) * 1000,
	}

	return tokenCache.accessToken
}

async function gmailFetch(
	env: Record<string, string | undefined>,
	path: string,
	options?: RequestInit,
): Promise<unknown> {
	const token = await getAccessToken(env)
	const response = await fetch(`${GMAIL_API_BASE}${path}`, {
		...options,
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			...options?.headers,
		},
	})

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`Gmail API error: ${response.status} ${text}`)
	}

	return response.json()
}

function htmlToText(html: string): string {
	return html
		.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
		.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>/gi, '\n\n')
		.replace(/<\/div>/gi, '\n')
		.replace(/<\/li>/gi, '\n')
		.replace(/<li[^>]*>/gi, '- ')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\n{3,}/g, '\n\n')
		.trim()
}

function getHeader(
	headers: Array<{ name: string; value: string }>,
	name: string,
): string | undefined {
	return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value
}

interface GmailMessagePart {
	mimeType: string
	body?: { data?: string; size: number }
	parts?: GmailMessagePart[]
	headers?: Array<{ name: string; value: string }>
}

function extractBody(payload: GmailMessagePart): string {
	if (payload.body?.data) {
		const decoded = Buffer.from(payload.body.data, 'base64url').toString('utf-8')
		if (payload.mimeType === 'text/html') {
			return htmlToText(decoded)
		}
		return decoded
	}

	if (payload.parts) {
		const textPart = payload.parts.find((p) => p.mimeType === 'text/plain')
		if (textPart) return extractBody(textPart)

		const htmlPart = payload.parts.find((p) => p.mimeType === 'text/html')
		if (htmlPart) return extractBody(htmlPart)

		for (const part of payload.parts) {
			const result = extractBody(part)
			if (result) return result
		}
	}

	return ''
}

interface GmailMessage {
	id: string
	threadId: string
	labelIds?: string[]
	snippet: string
	payload: GmailMessagePart & { headers: Array<{ name: string; value: string }> }
}

interface GmailListResponse {
	messages?: Array<{ id: string; threadId: string }>
	nextPageToken?: string
	resultSizeEstimate: number
}

function parseMessage(msg: GmailMessage): Record<string, unknown> {
	const headers = msg.payload.headers ?? []
	return {
		id: msg.id,
		threadId: msg.threadId,
		labels: msg.labelIds ?? [],
		from: getHeader(headers, 'From'),
		to: getHeader(headers, 'To'),
		subject: getHeader(headers, 'Subject'),
		date: getHeader(headers, 'Date'),
		snippet: msg.snippet,
		body: extractBody(msg.payload),
	}
}

async function fetchMessages(
	env: Record<string, string | undefined>,
	query: string | undefined,
	limit: number,
): Promise<Record<string, unknown>[]> {
	const params = new URLSearchParams({ maxResults: String(limit) })
	if (query) params.set('q', query)

	const results: Record<string, unknown>[] = []
	let pageToken: string | undefined

	while (results.length < limit) {
		if (pageToken) params.set('pageToken', pageToken)

		const listData = (await gmailFetch(env, `/messages?${params}`)) as GmailListResponse

		if (!listData.messages || listData.messages.length === 0) break

		const batch = listData.messages.slice(0, limit - results.length)
		const messages = await Promise.all(
			batch.map(async (m) => {
				const full = (await gmailFetch(env, `/messages/${m.id}?format=full`)) as GmailMessage
				return parseMessage(full)
			}),
		)

		results.push(...messages)

		if (!listData.nextPageToken || results.length >= limit) break
		pageToken = listData.nextPageToken
	}

	return results
}

function buildRawEmail(
	to: string,
	subject: string,
	body: string,
	cc?: string,
	bcc?: string,
): string {
	const lines: string[] = [
		`To: ${to}`,
		`Subject: ${subject}`,
		'MIME-Version: 1.0',
		'Content-Type: text/plain; charset="UTF-8"',
	]
	if (cc) lines.push(`Cc: ${cc}`)
	if (bcc) lines.push(`Bcc: ${bcc}`)
	lines.push('', body)

	const raw = lines.join('\r\n')
	return Buffer.from(raw).toString('base64url')
}

export const gmail = defineSkill(manifest, async (toolName, args, ctx) => {
	switch (toolName) {
		case 'read_inbox': {
			const limit = (args.limit as number | undefined) ?? 10
			const query = args.query as string | undefined
			ctx.log(`Reading inbox (limit: ${limit})`)

			try {
				const inboxQuery = query ? `in:inbox ${query}` : 'in:inbox'
				const messages = await fetchMessages(ctx.env, inboxQuery, limit)
				return { success: true, data: { messages, count: messages.length } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'send_email': {
			const to = args.to as string
			const subject = args.subject as string
			const body = args.body as string
			const cc = args.cc as string | undefined
			const bcc = args.bcc as string | undefined
			ctx.log(`Sending email to: ${to}`)

			try {
				const raw = buildRawEmail(to, subject, body, cc, bcc)
				const result = await gmailFetch(ctx.env, '/messages/send', {
					method: 'POST',
					body: JSON.stringify({ raw }),
				})
				const msg = result as { id: string; threadId: string; labelIds: string[] }
				return {
					success: true,
					data: { id: msg.id, threadId: msg.threadId, labels: msg.labelIds },
				}
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'search_emails': {
			const query = args.query as string
			const limit = (args.limit as number | undefined) ?? 10
			ctx.log(`Searching emails: ${query}`)

			try {
				const messages = await fetchMessages(ctx.env, query, limit)
				return { success: true, data: { messages, count: messages.length } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'get_email': {
			const id = args.id as string
			ctx.log(`Getting email: ${id}`)

			try {
				const msg = (await gmailFetch(ctx.env, `/messages/${id}?format=full`)) as GmailMessage
				return { success: true, data: parseMessage(msg) }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'label_email': {
			const id = args.id as string
			const labels = args.labels as string[]
			ctx.log(`Labeling email ${id} with: ${labels.join(', ')}`)

			try {
				const result = await gmailFetch(ctx.env, `/messages/${id}/modify`, {
					method: 'POST',
					body: JSON.stringify({ addLabelIds: labels }),
				})
				const msg = result as { id: string; labelIds: string[] }
				return { success: true, data: { id: msg.id, labels: msg.labelIds } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		default:
			return { success: false, error: `Unknown tool: ${toolName}` }
	}
})
