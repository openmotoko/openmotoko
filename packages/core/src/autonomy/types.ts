export type AutonomyLevel = 0 | 1 | 2 | 3

export interface AutonomyRule {
	id: string
	pattern: string
	level: 'autonomous' | 'propose' | 'blocked'
	approvalCount: number
	rejectionCount: number
	lastUpdated: number
	overriddenByUser: boolean
}

export interface AutonomyConfig {
	globalLevel: AutonomyLevel
	rules: AutonomyRule[]
}
