export interface RegistryEntry {
	id: string
	name: string
	version: string
	description: string
	author: string
	repository: string
	manifestUrl: string
	downloadUrl: string
	checksumSha256: string
	downloads: number
	verified: boolean
	tags: string[]
	publishedAt: number
}

export interface RegistrySearchParams {
	query?: string
	tags?: string[]
	verified?: boolean
	limit?: number
	offset?: number
}

export interface RegistryConfig {
	registryUrl: string
	cacheDir: string
	cacheTtlMs: number
}
