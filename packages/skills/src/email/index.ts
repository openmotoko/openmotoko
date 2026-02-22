import { readFile } from 'node:fs/promises'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'
import { ImapFlow } from 'imapflow'
import { createTransport } from 'nodemailer'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

function getSmtpConfig(env: Record<string, string | undefined>) {
	return {
		host: env.SMTP_HOST ?? 'localhost',
		port: Number(env.SMTP_PORT ?? 587),
		secure: env.SMTP_SECURE === 'true',
		auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } : undefined,
	}
}

function getImapConfig(env: Record<string, string | undefined>) {
	return {
		host: env.IMAP_HOST ?? 'localhost',
		port: Number(env.IMAP_PORT ?? 993),
		secure: env.IMAP_SECURE !== 'false',
		auth: {
			user: env.IMAP_USER ?? '',
			pass: env.IMAP_PASS ?? '',
		},
		logger: false as const,
	}
}

export const email = defineSkill(manifest, async (toolName, args, ctx) => {
	switch (toolName) {
		case 'read_inbox': {
			const limit = (args.limit as number | undefined) ?? 10
			ctx.log(`Reading inbox (limit: ${limit})`)

			const config = getImapConfig(ctx.env)
			if (!config.auth.user) {
				return { success: false, error: 'IMAP_USER environment variable is required' }
			}

			const client = new ImapFlow(config)
			try {
				await client.connect()
				const lock = await client.getMailboxLock('INBOX')
				const messages: Array<{
					uid: number
					subject: string
					from: string
					date: string
					preview: string
				}> = []

				try {
					const mailbox = client.mailbox
					const total =
						mailbox && typeof mailbox === 'object' && 'exists' in mailbox
							? (mailbox.exists as number)
							: 0
					const start = Math.max(1, total - limit + 1)

					for await (const msg of client.fetch(`${start}:*`, {
						envelope: true,
						bodyStructure: true,
						source: true,
					})) {
						messages.push({
							uid: msg.uid,
							subject: msg.envelope?.subject ?? '(no subject)',
							from: msg.envelope?.from?.[0]?.address ?? 'unknown',
							date: msg.envelope?.date?.toISOString() ?? '',
							preview: msg.source ? msg.source.toString().slice(0, 200) : '',
						})
					}
				} finally {
					lock.release()
				}

				await client.logout()
				return { success: true, data: { messages: messages.reverse(), count: messages.length } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'send_email': {
			const to = args.to as string
			const subject = args.subject as string
			const body = args.body as string
			ctx.log(`Sending email to: ${to}`)

			const config = getSmtpConfig(ctx.env)
			const transporter = createTransport(config)

			try {
				const info = await transporter.sendMail({
					from: ctx.env.SMTP_FROM ?? ctx.env.SMTP_USER,
					to,
					subject,
					text: body,
				})
				return {
					success: true,
					data: {
						messageId: info.messageId,
						to,
						subject,
					},
				}
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		default:
			return { success: false, error: `Unknown tool: ${toolName}` }
	}
})
