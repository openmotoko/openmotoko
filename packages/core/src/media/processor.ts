import type { MediaAttachment, ProcessedMedia } from './types.js'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const SUPPORTED_AUDIO_TYPES = new Set(['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'])

export class MediaProcessor {
	async process(attachment: MediaAttachment): Promise<ProcessedMedia | null> {
		let data: Buffer

		if (attachment.data) {
			data = attachment.data
		} else if (attachment.url) {
			try {
				const response = await fetch(attachment.url)
				data = Buffer.from(await response.arrayBuffer())
			} catch {
				return null
			}
		} else {
			return null
		}

		if (attachment.type === 'image') {
			if (!SUPPORTED_IMAGE_TYPES.has(attachment.mimeType)) return null
			if (data.length > MAX_IMAGE_SIZE) return null

			return {
				type: 'image',
				base64: data.toString('base64'),
				mimeType: attachment.mimeType,
			}
		}

		if (attachment.type === 'audio') {
			if (!SUPPORTED_AUDIO_TYPES.has(attachment.mimeType)) return null

			return {
				type: 'audio',
				base64: data.toString('base64'),
				mimeType: attachment.mimeType,
			}
		}

		return null
	}

	async processMultiple(attachments: MediaAttachment[]): Promise<ProcessedMedia[]> {
		const results: ProcessedMedia[] = []
		for (const attachment of attachments) {
			const processed = await this.process(attachment)
			if (processed) results.push(processed)
		}
		return results
	}
}

let instance: MediaProcessor | null = null

export function getMediaProcessor(): MediaProcessor {
	if (!instance) {
		instance = new MediaProcessor()
	}
	return instance
}
