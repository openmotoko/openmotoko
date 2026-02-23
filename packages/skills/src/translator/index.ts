import { readFile } from 'node:fs/promises'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

const baseUrl = process.env.LIBRETRANSLATE_URL ?? 'https://libretranslate.com'

export const translator = defineSkill(manifest, async (toolName, args, ctx) => {
	switch (toolName) {
		case 'translate_text': {
			const text = args.text as string
			const source = (args.source as string | undefined) ?? 'auto'
			const target = args.target as string
			ctx.log(`Translating from ${source} to ${target} (${text.length} chars)`)

			try {
				const response = await fetch(`${baseUrl}/translate`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ q: text, source, target, format: 'text' }),
				})

				if (!response.ok) {
					const body = await response.text()
					return { success: false, error: `LibreTranslate API error (${response.status}): ${body}` }
				}

				const data = (await response.json()) as { translatedText: string }

				return {
					success: true,
					data: {
						translated_text: data.translatedText,
						source,
						target,
						original_length: text.length,
					},
				}
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'detect_language': {
			const text = args.text as string
			ctx.log(`Detecting language for text (${text.length} chars)`)

			try {
				const response = await fetch(`${baseUrl}/detect`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ q: text }),
				})

				if (!response.ok) {
					const body = await response.text()
					return { success: false, error: `LibreTranslate API error (${response.status}): ${body}` }
				}

				const data = (await response.json()) as Array<{ confidence: number; language: string }>

				return {
					success: true,
					data: {
						detections: data.slice(0, 3),
						text_preview: text.slice(0, 100),
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
