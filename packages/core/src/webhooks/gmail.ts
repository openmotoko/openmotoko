import { eventBus } from '../events/bus.js'

export interface GmailWebhookConfig {
	serviceAccountKey: string
	topicName: string
	subscriptionName: string
	targetConversationId: string
}

interface PubSubMessage {
	message: {
		data: string
		messageId: string
		publishTime: string
	}
	subscription: string
}

interface GmailNotification {
	emailAddress: string
	historyId: number
}

export class GmailWebhook {
	private config: GmailWebhookConfig
	private accessToken: string | null = null
	private tokenExpiresAt = 0

	constructor(config: GmailWebhookConfig) {
		this.config = config
	}

	async handlePushNotification(raw: unknown): Promise<void> {
		const pubsub = raw as PubSubMessage
		if (!pubsub?.message?.data) return

		const decoded = Buffer.from(pubsub.message.data, 'base64').toString('utf-8')
		let notification: GmailNotification
		try {
			notification = JSON.parse(decoded) as GmailNotification
		} catch {
			return
		}

		const token = await this.getAccessToken()
		const email = await this.fetchLatestEmail(token, notification.emailAddress)
		if (!email) return

		eventBus.emit('message:received', {
			type: 'message:received',
			conversationId: this.config.targetConversationId,
			role: 'user',
			content: `[Email from ${email.from}] ${email.subject}\n\n${email.body}`,
		})
	}

	private async getAccessToken(): Promise<string> {
		if (this.accessToken && Date.now() < this.tokenExpiresAt) {
			return this.accessToken
		}

		let key: { client_email: string; private_key: string }
		try {
			key = JSON.parse(this.config.serviceAccountKey)
		} catch {
			throw new Error('Invalid service account key JSON')
		}

		const now = Math.floor(Date.now() / 1000)
		const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
		const claim = btoa(
			JSON.stringify({
				iss: key.client_email,
				scope: 'https://www.googleapis.com/auth/gmail.readonly',
				aud: 'https://oauth2.googleapis.com/token',
				iat: now,
				exp: now + 3600,
			}),
		)

		const { createSign } = await import('node:crypto')
		const signer = createSign('RSA-SHA256')
		signer.update(`${header}.${claim}`)
		const signature = signer.sign(key.private_key, 'base64url')

		const jwt = `${header}.${claim}.${signature}`

		const resp = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
		})

		if (!resp.ok) throw new Error('Failed to obtain access token')

		const data = (await resp.json()) as { access_token: string; expires_in: number }
		this.accessToken = data.access_token
		this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000
		return this.accessToken
	}

	private async fetchLatestEmail(
		token: string,
		emailAddress: string,
	): Promise<{ from: string; subject: string; body: string } | null> {
		const listResp = await fetch(
			`https://gmail.googleapis.com/gmail/v1/users/${emailAddress}/messages?maxResults=1`,
			{ headers: { Authorization: `Bearer ${token}` } },
		)
		if (!listResp.ok) return null

		const list = (await listResp.json()) as { messages?: { id: string }[] }
		if (!list.messages?.length) return null

		const msgResp = await fetch(
			`https://gmail.googleapis.com/gmail/v1/users/${emailAddress}/messages/${list.messages[0].id}`,
			{ headers: { Authorization: `Bearer ${token}` } },
		)
		if (!msgResp.ok) return null

		const msg = (await msgResp.json()) as {
			payload: { headers: { name: string; value: string }[]; body?: { data?: string } }
		}

		const headers = msg.payload.headers
		const from = headers.find((h) => h.name === 'From')?.value ?? 'unknown'
		const subject = headers.find((h) => h.name === 'Subject')?.value ?? '(no subject)'
		const bodyData = msg.payload.body?.data ?? ''
		const body = bodyData ? Buffer.from(bodyData, 'base64url').toString('utf-8') : ''

		return { from, subject, body }
	}
}
