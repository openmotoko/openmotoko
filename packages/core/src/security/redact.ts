import { getConfig } from '../config/index.js'

const PATTERNS: { name: string; regex: RegExp }[] = [
	{ name: 'api-key', regex: /(?:sk|pk|api)[_-](?:live|test|prod)?[_-]?[a-zA-Z0-9]{20,}/g },
	{ name: 'bearer-token', regex: /Bearer\s+[a-zA-Z0-9._-]{20,}/g },
	{ name: 'aws-key', regex: /AKIA[0-9A-Z]{16}/g },
	{ name: 'private-key', regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END/g },
	{ name: 'password-field', regex: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']{4,}["']/gi },
	{ name: 'connection-string', regex: /(?:mongodb|postgres|mysql|redis):\/\/[^\s"']+/g },
	{ name: 'jwt', regex: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g },
	{ name: 'github-token', regex: /gh[pousr]_[a-zA-Z0-9]{36,}/g },
	{ name: 'slack-token', regex: /xox[baprs]-[a-zA-Z0-9-]+/g },
	{ name: 'hex-secret', regex: /(?:secret|token|key)\s*[:=]\s*["'][0-9a-fA-F]{32,}["']/gi },
]

export function redact(text: string, mode?: 'tools' | 'all' | 'off'): string {
	const config = getConfig()
	const effectiveMode = mode ?? config.redactSensitive
	if (effectiveMode === 'off') return text

	let result = text
	for (const { name, regex } of PATTERNS) {
		result = result.replace(regex, `[REDACTED:${name}]`)
	}

	return result
}

export function containsSensitiveData(text: string): boolean {
	for (const { regex } of PATTERNS) {
		regex.lastIndex = 0
		if (regex.test(text)) return true
	}
	return false
}
