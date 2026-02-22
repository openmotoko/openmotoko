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
	rating: number
	ratingCount: number
	securityStatus: 'passed' | 'failed' | 'pending' | 'unknown'
	publishedAt: number
}

export interface SkillDetail extends RegistryEntry {
	ratings: SkillRatingEntry[]
	securityScan: SecurityScanEntry | null
}

export interface SkillRatingEntry {
	id: string
	userId: string
	stars: number
	comment: string
	createdAt: number
}

export interface SecurityScanEntry {
	passed: boolean
	issues: SecurityIssue[]
	scannedAt: number
}

export interface SecurityIssue {
	severity: 'critical' | 'high' | 'medium' | 'low'
	rule: string
	message: string
	file?: string
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
