import { describe, expect, it } from 'vitest'

const SAFE_ENV_PREFIXES = ['NODE_', 'npm_', 'PATH', 'HOME', 'LANG', 'TERM', 'SHELL']

function buildSandboxedEnv(declaredEnvKeys: string[]): Record<string, string | undefined> {
	const sandboxed: Record<string, string | undefined> = {}
	for (const key of declaredEnvKeys) {
		sandboxed[key] = process.env[key]
	}
	for (const key of Object.keys(process.env)) {
		if (SAFE_ENV_PREFIXES.some((p) => key.startsWith(p))) {
			sandboxed[key] = process.env[key]
		}
	}
	return sandboxed
}

describe('Worker Environment Sandbox', () => {
	it('includes PATH', () => {
		const env = buildSandboxedEnv([])
		expect(env.PATH).toBeDefined()
	})

	it('includes HOME', () => {
		const env = buildSandboxedEnv([])
		expect(env.HOME).toBeDefined()
	})

	it('includes NODE_ prefixed vars', () => {
		const original = process.env.NODE_ENV
		process.env.NODE_ENV = 'test'
		const env = buildSandboxedEnv([])
		expect(env.NODE_ENV).toBe('test')
		if (original === undefined) delete process.env.NODE_ENV
		else process.env.NODE_ENV = original
	})

	it('excludes secrets not in declared list', () => {
		process.env.SUPER_SECRET_KEY = 'leaked!'
		const env = buildSandboxedEnv([])
		expect(env.SUPER_SECRET_KEY).toBeUndefined()
		delete process.env.SUPER_SECRET_KEY
	})

	it('includes explicitly declared env vars', () => {
		process.env.MY_CUSTOM_KEY = 'allowed'
		const env = buildSandboxedEnv(['MY_CUSTOM_KEY'])
		expect(env.MY_CUSTOM_KEY).toBe('allowed')
		delete process.env.MY_CUSTOM_KEY
	})

	it('does not leak ANTHROPIC_API_KEY', () => {
		process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
		const env = buildSandboxedEnv([])
		expect(env.ANTHROPIC_API_KEY).toBeUndefined()
		delete process.env.ANTHROPIC_API_KEY
	})

	it('does not leak OPENAI_API_KEY', () => {
		process.env.OPENAI_API_KEY = 'sk-test'
		const env = buildSandboxedEnv([])
		expect(env.OPENAI_API_KEY).toBeUndefined()
		delete process.env.OPENAI_API_KEY
	})

	it('does not leak OPENMOTOKO_PASSWORD', () => {
		process.env.OPENMOTOKO_PASSWORD = 'admin123'
		const env = buildSandboxedEnv([])
		expect(env.OPENMOTOKO_PASSWORD).toBeUndefined()
		delete process.env.OPENMOTOKO_PASSWORD
	})

	it('does not leak GMAIL_SERVICE_ACCOUNT_KEY', () => {
		process.env.GMAIL_SERVICE_ACCOUNT_KEY = '{"key":"value"}'
		const env = buildSandboxedEnv([])
		expect(env.GMAIL_SERVICE_ACCOUNT_KEY).toBeUndefined()
		delete process.env.GMAIL_SERVICE_ACCOUNT_KEY
	})

	it('does not leak GOOGLE_AI_API_KEY', () => {
		process.env.GOOGLE_AI_API_KEY = 'AIza-test'
		const env = buildSandboxedEnv([])
		expect(env.GOOGLE_AI_API_KEY).toBeUndefined()
		delete process.env.GOOGLE_AI_API_KEY
	})

	it('declared vars take precedence', () => {
		process.env.ANTHROPIC_API_KEY = 'sk-for-this-skill'
		const env = buildSandboxedEnv(['ANTHROPIC_API_KEY'])
		expect(env.ANTHROPIC_API_KEY).toBe('sk-for-this-skill')
		delete process.env.ANTHROPIC_API_KEY
	})
})
