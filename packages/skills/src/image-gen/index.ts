import { readFile } from 'node:fs/promises'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

export const imageGen = defineSkill(manifest, async (toolName, args, ctx) => {
	if (toolName !== 'generate_image') {
		return { success: false, error: `Unknown tool: ${toolName}` }
	}

	const apiKey = ctx.env.OPENAI_API_KEY
	if (!apiKey) {
		return { success: false, error: 'OPENAI_API_KEY is required' }
	}

	const prompt = args.prompt as string
	const size = (args.size as string | undefined) ?? '1024x1024'
	const quality = (args.quality as string | undefined) ?? 'standard'
	const style = (args.style as string | undefined) ?? 'vivid'

	ctx.log(`Generating image: ${prompt.slice(0, 80)}`)

	try {
		const response = await fetch('https://api.openai.com/v1/images/generations', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: 'dall-e-3',
				prompt,
				size,
				quality,
				style,
				n: 1,
				response_format: 'url',
			}),
		})

		const json = (await response.json()) as {
			data?: { url: string; revised_prompt: string }[]
			error?: { message: string }
		}

		if (!response.ok) {
			return {
				success: false,
				error: json.error?.message ?? `API request failed with status ${response.status}`,
			}
		}

		const image = json.data?.[0]
		if (!image) {
			return { success: false, error: 'No image data returned from API' }
		}

		return {
			success: true,
			data: {
				url: image.url,
				revised_prompt: image.revised_prompt,
				size,
				quality,
				style,
			},
		}
	} catch (err) {
		return { success: false, error: (err as Error).message }
	}
})
