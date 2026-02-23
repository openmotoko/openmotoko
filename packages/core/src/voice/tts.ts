import type { TTSProvider, TTSResult } from './types.js'

export class TTSEngine {
	private provider: TTSProvider
	private apiKey: string
	private voiceId: string
	private model: string

	constructor(options: {
		provider: TTSProvider
		apiKey?: string
		voiceId?: string
		model?: string
	}) {
		this.provider = options.provider
		this.apiKey = options.apiKey ?? ''
		this.voiceId = options.voiceId ?? 'default'
		this.model = options.model ?? 'eleven_monolingual_v1'
	}

	async synthesize(text: string): Promise<TTSResult> {
		switch (this.provider) {
			case 'elevenlabs':
				return this.synthesizeElevenLabs(text)
			case 'openai':
				return this.synthesizeOpenAI(text)
			default:
				throw new Error(`TTS provider ${this.provider} not supported yet`)
		}
	}

	private async synthesizeElevenLabs(text: string): Promise<TTSResult> {
		const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'xi-api-key': this.apiKey,
			},
			body: JSON.stringify({
				text,
				model_id: this.model,
				voice_settings: { stability: 0.5, similarity_boost: 0.75 },
			}),
		})

		if (!response.ok) {
			throw new Error(`ElevenLabs TTS failed: ${response.status}`)
		}

		const audio = Buffer.from(await response.arrayBuffer())
		return { audio, mimeType: 'audio/mpeg' }
	}

	private async synthesizeOpenAI(text: string): Promise<TTSResult> {
		const response = await fetch('https://api.openai.com/v1/audio/speech', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.apiKey}`,
			},
			body: JSON.stringify({
				model: 'tts-1',
				input: text,
				voice: this.voiceId || 'alloy',
			}),
		})

		if (!response.ok) {
			throw new Error(`OpenAI TTS failed: ${response.status}`)
		}

		const audio = Buffer.from(await response.arrayBuffer())
		return { audio, mimeType: 'audio/mpeg' }
	}
}
