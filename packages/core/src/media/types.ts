export type MediaType = 'image' | 'audio' | 'video' | 'document'

export interface MediaAttachment {
	type: MediaType
	url?: string
	data?: Buffer
	mimeType: string
	filename?: string
	size?: number
}

export interface ProcessedMedia {
	type: MediaType
	base64: string
	mimeType: string
	width?: number
	height?: number
}
