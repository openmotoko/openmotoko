import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1'
const OPENAI_API_BASE = 'https://api.openai.com/v1'
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'
const OUTPUT_DIR = join(homedir(), '.openmotoko', 'voice-output')

function getElevenLabsKey(env: Record<string, string | undefined>): string {
	const key = env.ELEVENLABS_API_KEY
	if (!key) {
		throw new Error('ELEVENLABS_API_KEY environment variable is required')
	}
	return key
}

function getOpenAIKey(env: Record<string, string | undefined>): string {
	const key = env.OPENAI_API_KEY
	if (!key) {
		throw new Error('OPENAI_API_KEY environment variable is required')
	}
	return key
}

export const voice = defineSkill(manifest, async (toolName, args, ctx) => {
	switch (toolName) {
		case 'text_to_speech': {
			const text = args.text as string
			const voiceId = (args.voice as string | undefined) ?? DEFAULT_VOICE_ID
			const speed = (args.speed as number | undefined) ?? 1.0
			ctx.log(`Converting text to speech (voice: ${voiceId}, speed: ${speed})`)

			try {
				const apiKey = getElevenLabsKey(ctx.env)

				const response = await fetch(`${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`, {
					method: 'POST',
					headers: {
						'xi-api-key': apiKey,
						'Content-Type': 'application/json',
						Accept: 'audio/mpeg',
					},
					body: JSON.stringify({
						text,
						model_id: 'eleven_monolingual_v1',
						voice_settings: {
							stability: 0.5,
							similarity_boost: 0.75,
							speed,
						},
					}),
				})

				if (!response.ok) {
					const errorText = await response.text()
					throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`)
				}

				const audioBuffer = Buffer.from(await response.arrayBuffer())
				await mkdir(OUTPUT_DIR, { recursive: true })

				const filename = `tts-${Date.now()}.mp3`
				const outputPath = join(OUTPUT_DIR, filename)
				await writeFile(outputPath, audioBuffer)

				return {
					success: true,
					data: {
						path: outputPath,
						filename,
						size: audioBuffer.length,
						voiceId,
						speed,
						textLength: text.length,
					},
				}
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'transcribe_audio': {
			const audioPath = args.audioPath as string
			ctx.log(`Transcribing audio: ${audioPath}`)

			try {
				const apiKey = getOpenAIKey(ctx.env)
				const audioData = await readFile(audioPath)
				const filename = basename(audioPath)

				const formData = new FormData()
				formData.append('file', new Blob([audioData]), filename)
				formData.append('model', 'whisper-1')
				formData.append('response_format', 'verbose_json')

				const response = await fetch(`${OPENAI_API_BASE}/audio/transcriptions`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${apiKey}`,
					},
					body: formData,
				})

				if (!response.ok) {
					const errorText = await response.text()
					throw new Error(`OpenAI Whisper API error: ${response.status} ${errorText}`)
				}

				const result = (await response.json()) as {
					text: string
					language: string
					duration: number
					segments?: Array<{
						id: number
						start: number
						end: number
						text: string
					}>
				}

				return {
					success: true,
					data: {
						text: result.text,
						language: result.language,
						duration: result.duration,
						segments: result.segments?.map((s) => ({
							id: s.id,
							start: s.start,
							end: s.end,
							text: s.text,
						})),
					},
				}
			} catch (err) {
				if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
					return { success: false, error: `Audio file not found: ${audioPath}` }
				}
				return { success: false, error: (err as Error).message }
			}
		}

		default:
			return { success: false, error: `Unknown tool: ${toolName}` }
	}
})
