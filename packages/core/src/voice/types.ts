export type TTSProvider = 'elevenlabs' | 'sherpa-onnx' | 'openai'
export type STTProvider = 'whisper-api' | 'whisper-local' | 'openai'

export interface VoiceConfig {
	tts: {
		provider: TTSProvider
		apiKey?: string
		voiceId?: string
		model?: string
	}
	stt: {
		provider: STTProvider
		apiKey?: string
		model?: string
	}
}

export interface TTSResult {
	audio: Buffer
	mimeType: string
	duration?: number
}

export interface STTResult {
	text: string
	confidence?: number
	language?: string
	duration?: number
}
