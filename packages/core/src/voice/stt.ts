import type { STTProvider, STTResult } from './types.js'

export class STTEngine {
	private provider: STTProvider
	private apiKey: string
	private model: string

	constructor(options: { provider: STTProvider; apiKey?: string; model?: string }) {
		this.provider = options.provider
		this.apiKey = options.apiKey ?? ''
		this.model = options.model ?? 'whisper-1'
	}

	async transcribe(audio: Buffer, mimeType = 'audio/webm'): Promise<STTResult> {
		switch (this.provider) {
			case 'whisper-api':
			case 'openai':
				return this.transcribeOpenAI(audio, mimeType)
			default:
				throw new Error(`STT provider ${this.provider} not supported yet`)
		}
	}

	private async transcribeOpenAI(audio: Buffer, mimeType: string): Promise<STTResult> {
		const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('wav') ? 'wav' : 'mp3'
		const formData = new FormData()
		formData.append('file', new Blob([new Uint8Array(audio)], { type: mimeType }), `audio.${ext}`)
		formData.append('model', this.model)

		const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
			method: 'POST',
			headers: { Authorization: `Bearer ${this.apiKey}` },
			body: formData,
		})

		if (!response.ok) {
			throw new Error(`OpenAI STT failed: ${response.status}`)
		}

		const result = (await response.json()) as { text: string }
		return { text: result.text }
	}
}
