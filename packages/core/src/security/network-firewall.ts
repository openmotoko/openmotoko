export interface NetworkPolicy {
	allowedDomains: string[]
	blockedDomains: string[]
	allowPrivateRanges: boolean
	maxRequestsPerMinute: number
}

export interface FirewallResult {
	allowed: boolean
	reason?: string
}

export interface FirewallViolation {
	skillId: string
	url: string
	reason: string
	timestamp: number
}

interface RateLimitEntry {
	timestamps: number[]
	policy: NetworkPolicy | null
}

const PRIVATE_IPV4_RANGES = [
	/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
	/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
	/^192\.168\.\d{1,3}\.\d{1,3}$/,
	/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
	/^169\.254\.\d{1,3}\.\d{1,3}$/,
	/^0\.0\.0\.0$/,
]

const PRIVATE_IPV6 = ['::1', 'fe80::', 'fc00::', 'fd00::']

export class NetworkFirewall {
	private rateLimits: Map<string, RateLimitEntry> = new Map()
	private violations: FirewallViolation[] = []
	private defaultPolicy: NetworkPolicy = {
		allowedDomains: [],
		blockedDomains: [],
		allowPrivateRanges: false,
		maxRequestsPerMinute: 60,
	}

	validateUrl(skillId: string, url: string, policy?: NetworkPolicy): FirewallResult {
		const effectivePolicy = policy ?? this.defaultPolicy

		let parsed: URL
		try {
			parsed = new URL(url)
		} catch {
			return this.deny(skillId, url, 'Invalid URL')
		}

		const hostname = parsed.hostname

		// Check for private IP ranges
		if (!effectivePolicy.allowPrivateRanges && this.isPrivateIp(hostname)) {
			return this.deny(skillId, url, `Private IP range blocked: ${hostname}`)
		}

		// Check blocked domains first (takes precedence)
		if (this.matchesDomainList(hostname, effectivePolicy.blockedDomains)) {
			return this.deny(skillId, url, `Domain explicitly blocked: ${hostname}`)
		}

		// If allowedDomains is non-empty, only those domains are permitted
		if (effectivePolicy.allowedDomains.length > 0) {
			if (!this.matchesDomainList(hostname, effectivePolicy.allowedDomains)) {
				return this.deny(skillId, url, `Domain not in allowlist: ${hostname}`)
			}
		} else {
			// No allowlist means block by default
			return this.deny(skillId, url, 'No domains in allowlist; blocked by default')
		}

		// Check rate limit
		if (!this.checkRateLimit(skillId, effectivePolicy)) {
			return this.deny(skillId, url, 'Rate limit exceeded')
		}

		this.recordRequest(skillId, effectivePolicy)
		return { allowed: true }
	}

	isPrivateIp(hostname: string): boolean {
		// IPv4 checks
		for (const range of PRIVATE_IPV4_RANGES) {
			if (range.test(hostname)) return true
		}

		// IPv6 checks
		const lowerHost = hostname.toLowerCase().replace(/^\[|\]$/g, '')
		if (lowerHost === '::1') return true
		for (const prefix of PRIVATE_IPV6) {
			if (lowerHost.startsWith(prefix)) return true
		}

		// localhost
		if (hostname === 'localhost' || hostname === 'localhost.localdomain') {
			return true
		}

		return false
	}

	checkRateLimit(skillId: string, policy?: NetworkPolicy): boolean {
		const effectivePolicy = policy ?? this.defaultPolicy
		const entry = this.rateLimits.get(skillId)
		if (!entry) return true

		const now = Date.now()
		const windowStart = now - 60_000
		const recentRequests = entry.timestamps.filter((t) => t > windowStart)

		return recentRequests.length < effectivePolicy.maxRequestsPerMinute
	}

	getViolations(skillId?: string): FirewallViolation[] {
		if (skillId) {
			return this.violations.filter((v) => v.skillId === skillId)
		}
		return [...this.violations]
	}

	private deny(skillId: string, url: string, reason: string): FirewallResult {
		this.violations.push({
			skillId,
			url,
			reason,
			timestamp: Date.now(),
		})
		return { allowed: false, reason }
	}

	private recordRequest(skillId: string, policy: NetworkPolicy): void {
		const entry = this.rateLimits.get(skillId)
		const now = Date.now()

		if (entry) {
			// Sliding window cleanup
			const windowStart = now - 60_000
			entry.timestamps = entry.timestamps.filter((t) => t > windowStart)
			entry.timestamps.push(now)
		} else {
			this.rateLimits.set(skillId, {
				timestamps: [now],
				policy,
			})
		}
	}

	private matchesDomainList(hostname: string, domains: string[]): boolean {
		const lowerHost = hostname.toLowerCase()
		for (const domain of domains) {
			const lowerDomain = domain.toLowerCase()
			if (lowerDomain.startsWith('*.')) {
				const suffix = lowerDomain.slice(1) // e.g. ".example.com"
				if (lowerHost === lowerDomain.slice(2) || lowerHost.endsWith(suffix)) {
					return true
				}
			} else if (lowerHost === lowerDomain) {
				return true
			}
		}
		return false
	}
}

export const networkFirewall = new NetworkFirewall()
