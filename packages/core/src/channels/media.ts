import type { MediaAttachment } from './types.js'

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'])

const AUDIO_MIMES = new Set(['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/mp4'])

const VIDEO_MIMES = new Set(['video/mp4', 'video/webm', 'video/ogg'])

export function classifyMimeType(mime: string): MediaAttachment['type'] {
	if (IMAGE_MIMES.has(mime)) return 'image'
	if (AUDIO_MIMES.has(mime)) return 'audio'
	if (VIDEO_MIMES.has(mime)) return 'video'
	return 'document'
}

export function normalizeAttachment(raw: {
	url?: string
	buffer?: Buffer
	mimeType?: string
	filename?: string
	size?: number
}): MediaAttachment {
	const mime = raw.mimeType ?? 'application/octet-stream'
	return {
		type: classifyMimeType(mime),
		url: raw.url,
		buffer: raw.buffer,
		mimeType: mime,
		filename: raw.filename,
		size: raw.size,
	}
}

export function splitMessage(text: string, maxLength: number): string[] {
	if (text.length <= maxLength) return [text]

	const chunks: string[] = []
	let remaining = text

	while (remaining.length > 0) {
		if (remaining.length <= maxLength) {
			chunks.push(remaining)
			break
		}

		let splitAt = remaining.lastIndexOf('\n', maxLength)
		if (splitAt < maxLength * 0.5) {
			splitAt = remaining.lastIndexOf(' ', maxLength)
		}
		if (splitAt < maxLength * 0.3) {
			splitAt = maxLength
		}

		chunks.push(remaining.slice(0, splitAt))
		remaining = remaining.slice(splitAt).trimStart()
	}

	return chunks
}

export const CHANNEL_MAX_LENGTH: Record<string, number> = {
	telegram: 4096,
	discord: 2000,
	slack: 40000,
	whatsapp: 65536,
	signal: 10000,
	imessage: 20000,
	'google-chat': 4096,
	teams: 28000,
	webchat: 100000,
}
