export type ThreatSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ThreatInfo {
	pattern: string
	category: string
	matched: string
	severity: ThreatSeverity
}

export interface InjectionResult {
	score: number
	threats: ThreatInfo[]
	blocked: boolean
}

interface PatternRule {
	pattern: RegExp
	category: string
	severity: ThreatSeverity
	weight: number
}

const ROLE_IMPERSONATION_PATTERNS: PatternRule[] = [
	{
		pattern: /ignore\s+(?:all\s+)?previous\s+instructions/i,
		category: 'role_impersonation',
		severity: 'critical',
		weight: 0.9,
	},
	{
		pattern: /ignore\s+(?:all\s+)?(?:prior|above)\s+(?:instructions|prompts|rules)/i,
		category: 'role_impersonation',
		severity: 'critical',
		weight: 0.9,
	},
	{
		pattern: /you\s+are\s+now\s+(?:a|an|the)\b/i,
		category: 'role_impersonation',
		severity: 'high',
		weight: 0.8,
	},
	{
		pattern: /^system\s*:/im,
		category: 'role_impersonation',
		severity: 'high',
		weight: 0.7,
	},
	{
		pattern: /admin\s+override/i,
		category: 'role_impersonation',
		severity: 'critical',
		weight: 0.95,
	},
	{
		pattern: /forget\s+(?:all\s+)?your\s+(?:rules|instructions|guidelines|programming)/i,
		category: 'role_impersonation',
		severity: 'critical',
		weight: 0.9,
	},
	{
		pattern: /disregard\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|context)/i,
		category: 'role_impersonation',
		severity: 'critical',
		weight: 0.9,
	},
	{
		pattern: /pretend\s+(?:you\s+are|to\s+be)\s+(?:a|an)?\s*(?:different|new)/i,
		category: 'role_impersonation',
		severity: 'high',
		weight: 0.75,
	},
	{
		pattern:
			/(?:act|behave)\s+as\s+(?:if\s+)?(?:you\s+(?:are|were)\s+)?(?:a|an)\s+(?:different|new)/i,
		category: 'role_impersonation',
		severity: 'high',
		weight: 0.75,
	},
	{
		pattern:
			/override\s+(?:all\s+)?(?:safety|security|content)\s+(?:filters|restrictions|policies)/i,
		category: 'role_impersonation',
		severity: 'critical',
		weight: 0.95,
	},
]

const ENCODING_ATTACK_PATTERNS: PatternRule[] = [
	{
		pattern: /(?:[A-Za-z0-9+/]{4}){8,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/,
		category: 'encoding_attack',
		severity: 'medium',
		weight: 0.4,
	},
	{
		// biome-ignore lint/suspicious/noMisleadingCharacterClass: intentionally matching zero-width Unicode characters for security
		pattern: /[\u200B\u200C\u200D\uFEFF\u2060\u00AD]/,
		category: 'encoding_attack',
		severity: 'high',
		weight: 0.7,
	},
	{
		pattern: /[\u0410-\u044F]/,
		category: 'encoding_attack',
		severity: 'medium',
		weight: 0.3,
	},
	{
		pattern: /[\u0391-\u03C9]/,
		category: 'encoding_attack',
		severity: 'medium',
		weight: 0.3,
	},
	{
		pattern: /\\u[0-9a-fA-F]{4}/,
		category: 'encoding_attack',
		severity: 'medium',
		weight: 0.5,
	},
	{
		pattern: /&#x?[0-9a-fA-F]+;/,
		category: 'encoding_attack',
		severity: 'medium',
		weight: 0.5,
	},
]

const DELIMITER_INJECTION_PATTERNS: PatternRule[] = [
	{
		pattern: /```(?:system|assistant|user)\b/i,
		category: 'delimiter_injection',
		severity: 'high',
		weight: 0.8,
	},
	{
		pattern: /<\/?(?:system|instruction|prompt|context|admin|root)\s*>/i,
		category: 'delimiter_injection',
		severity: 'high',
		weight: 0.85,
	},
	{
		pattern: /\{\s*"(?:role|system_prompt|instructions)"\s*:/i,
		category: 'delimiter_injection',
		severity: 'high',
		weight: 0.75,
	},
	{
		pattern: /---\s*(?:system|instructions|override)\s*---/i,
		category: 'delimiter_injection',
		severity: 'high',
		weight: 0.8,
	},
	{
		pattern: /\[INST\]|\[\/INST\]|\[SYSTEM\]/i,
		category: 'delimiter_injection',
		severity: 'high',
		weight: 0.85,
	},
	{
		pattern: /<\|(?:im_start|im_end|system|endoftext)\|>/i,
		category: 'delimiter_injection',
		severity: 'critical',
		weight: 0.9,
	},
]

const ALL_PATTERNS: PatternRule[] = [
	...ROLE_IMPERSONATION_PATTERNS,
	...ENCODING_ATTACK_PATTERNS,
	...DELIMITER_INJECTION_PATTERNS,
]

function checkBase64Content(text: string): ThreatInfo | null {
	const base64Regex = /(?:[A-Za-z0-9+/]{4}){8,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g
	let match: RegExpExecArray | null = base64Regex.exec(text)
	while (match !== null) {
		try {
			const decoded = Buffer.from(match[0], 'base64').toString('utf-8')
			if (/[^\x20-\x7E\n\r\t]/.test(decoded)) continue
			const lowerDecoded = decoded.toLowerCase()
			if (
				lowerDecoded.includes('ignore') ||
				lowerDecoded.includes('system') ||
				lowerDecoded.includes('override') ||
				lowerDecoded.includes('instruction')
			) {
				return {
					pattern: 'base64_encoded_instruction',
					category: 'encoding_attack',
					matched: match[0].substring(0, 80),
					severity: 'critical',
				}
			}
		} catch {
			// Not valid base64, skip
		}
		match = base64Regex.exec(text)
	}
	return null
}

function stripZeroWidth(text: string): { cleaned: string; hadZeroWidth: boolean } {
	// biome-ignore lint/suspicious/noMisleadingCharacterClass: intentionally matching zero-width Unicode characters for security
	const zeroWidthRegex = /[\u200B\u200C\u200D\uFEFF\u2060\u00AD]/g
	const hadZeroWidth = zeroWidthRegex.test(text)
	return {
		cleaned: text.replace(zeroWidthRegex, ''),
		hadZeroWidth,
	}
}

export function detectInjection(text: string, options?: { threshold?: number }): InjectionResult {
	const threshold = options?.threshold ?? 0.7
	const threats: ThreatInfo[] = []
	let maxScore = 0

	const { cleaned, hadZeroWidth } = stripZeroWidth(text)
	const textToScan = hadZeroWidth ? cleaned : text

	if (hadZeroWidth) {
		threats.push({
			pattern: 'zero_width_characters',
			category: 'encoding_attack',
			matched: '[zero-width characters detected]',
			severity: 'high',
		})
		maxScore = Math.max(maxScore, 0.7)
	}

	for (const rule of ALL_PATTERNS) {
		rule.pattern.lastIndex = 0
		const match = rule.pattern.exec(textToScan)
		if (match) {
			threats.push({
				pattern: rule.pattern.source.substring(0, 100),
				category: rule.category,
				matched: match[0].substring(0, 100),
				severity: rule.severity,
			})
			maxScore = Math.max(maxScore, rule.weight)
		}
	}

	const base64Threat = checkBase64Content(textToScan)
	if (base64Threat) {
		threats.push(base64Threat)
		maxScore = Math.max(maxScore, 0.95)
	}

	if (threats.length > 1) {
		maxScore = Math.min(1, maxScore + threats.length * 0.05)
	}

	const score = Math.round(maxScore * 1000) / 1000

	return {
		score,
		threats,
		blocked: score >= threshold,
	}
}
