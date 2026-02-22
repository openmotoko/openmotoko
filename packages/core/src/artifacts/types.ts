export type ArtifactType = 'code' | 'markdown' | 'html' | 'mermaid' | 'text'

export interface Artifact {
	id: string
	conversationId: string
	type: ArtifactType
	title: string
	content: string
	language: string | null
	version: number
	createdAt: number
	updatedAt: number
}

export interface ArtifactVersion {
	id: string
	artifactId: string
	version: number
	content: string
	createdAt: number
}

export interface CreateArtifactInput {
	conversationId: string
	type: ArtifactType
	title: string
	content: string
	language?: string
}

export interface UpdateArtifactInput {
	content: string
	title?: string
	type?: ArtifactType
	language?: string
}
