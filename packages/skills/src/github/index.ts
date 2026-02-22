import { readFile } from 'node:fs/promises'
import { Octokit } from '@octokit/rest'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

function getOctokit(env: Record<string, string | undefined>): Octokit {
	const token = env.GITHUB_TOKEN
	if (!token) {
		throw new Error('GITHUB_TOKEN environment variable is required')
	}
	return new Octokit({ auth: token })
}

export const github = defineSkill(manifest, async (toolName, args, ctx) => {
	let octokit: Octokit
	try {
		octokit = getOctokit(ctx.env)
	} catch (err) {
		return { success: false, error: (err as Error).message }
	}

	switch (toolName) {
		case 'list_issues': {
			const owner = args.owner as string
			const repo = args.repo as string
			ctx.log(`Listing issues for ${owner}/${repo}`)

			try {
				const { data } = await octokit.issues.listForRepo({
					owner,
					repo,
					state: 'open',
					per_page: 30,
				})
				const issues = data.map((issue) => ({
					number: issue.number,
					title: issue.title,
					state: issue.state,
					author: issue.user?.login,
					labels: issue.labels.map((l) => (typeof l === 'string' ? l : l.name)),
					createdAt: issue.created_at,
					url: issue.html_url,
				}))
				return { success: true, data: { issues, count: issues.length } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'create_pr': {
			const owner = args.owner as string
			const repo = args.repo as string
			const title = args.title as string
			const body = args.body as string
			const head = args.head as string
			const base = args.base as string
			ctx.log(`Creating PR: ${title} (${head} -> ${base})`)

			try {
				const { data } = await octokit.pulls.create({
					owner,
					repo,
					title,
					body,
					head,
					base,
				})
				return {
					success: true,
					data: {
						number: data.number,
						title: data.title,
						url: data.html_url,
						state: data.state,
					},
				}
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'get_file': {
			const owner = args.owner as string
			const repo = args.repo as string
			const path = args.path as string
			ctx.log(`Getting file: ${owner}/${repo}/${path}`)

			try {
				const { data } = await octokit.repos.getContent({
					owner,
					repo,
					path,
				})

				if (Array.isArray(data)) {
					return {
						success: true,
						data: {
							type: 'directory',
							entries: data.map((e) => ({
								name: e.name,
								type: e.type,
								path: e.path,
								size: e.size,
							})),
						},
					}
				}

				if (data.type !== 'file' || !('content' in data)) {
					return { success: false, error: 'Path is not a file' }
				}

				const content = Buffer.from(data.content, 'base64').toString('utf-8')
				return {
					success: true,
					data: {
						path: data.path,
						size: data.size,
						content,
						sha: data.sha,
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
