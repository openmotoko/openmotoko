import { existsSync, mkdirSync, readFileSync, unwatchFile, watchFile, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import JSON5 from 'json5'
import type { OpenMotokoConfig } from './schema.js'
import { openMotokoConfigSchema } from './schema.js'

const CONFIG_DIR = join(homedir(), '.openmotoko')
const CONFIG_FILE = 'openmotoko.json'

function getConfigPath(customPath?: string): string {
	if (customPath) return resolve(customPath)
	return join(CONFIG_DIR, CONFIG_FILE)
}

function ensureConfigDir(): void {
	if (!existsSync(CONFIG_DIR)) {
		mkdirSync(CONFIG_DIR, { recursive: true })
	}
}

export function loadConfigFromFile(customPath?: string): OpenMotokoConfig {
	const configPath = getConfigPath(customPath)
	if (!existsSync(configPath)) {
		return openMotokoConfigSchema.parse({})
	}
	const raw = readFileSync(configPath, 'utf-8')
	const parsed = JSON5.parse(raw)
	return openMotokoConfigSchema.parse(parsed)
}

export function writeDefaultConfig(customPath?: string): string {
	ensureConfigDir()
	const configPath = getConfigPath(customPath)
	if (existsSync(configPath)) return configPath

	const defaults: Record<string, unknown> = {
		gateway: { bind: 'loopback', port: 3000 },
		channels: {},
		agents: { model: 'balanced' },
		tools: {},
		pulse: { enabled: false },
		mcp: { servers: [], expose: false },
		llm: { providers: [], aliases: {} },
		notifications: {},
	}

	writeFileSync(configPath, JSON.stringify(defaults, null, 2), 'utf-8')
	return configPath
}

let cachedConfig: OpenMotokoConfig | null = null
let watchCallback: ((config: OpenMotokoConfig) => void) | null = null
let watchedPath: string | null = null

export function getConfig(customPath?: string): OpenMotokoConfig {
	if (cachedConfig) return cachedConfig
	cachedConfig = loadConfigFromFile(customPath)
	return cachedConfig
}

export function reloadConfig(customPath?: string): OpenMotokoConfig {
	cachedConfig = loadConfigFromFile(customPath)
	return cachedConfig
}

export function watchConfig(
	customPath?: string,
	onChange?: (config: OpenMotokoConfig) => void,
): void {
	const configPath = getConfigPath(customPath)
	if (watchedPath) {
		unwatchFile(watchedPath)
	}
	watchedPath = configPath
	watchCallback = onChange ?? null

	if (!existsSync(configPath)) return

	watchFile(configPath, { interval: 2000 }, () => {
		try {
			const newConfig = loadConfigFromFile(customPath)
			cachedConfig = newConfig
			if (watchCallback) watchCallback(newConfig)
		} catch (err) {
			console.error('Config reload failed:', err instanceof Error ? err.message : err)
		}
	})
}

export function unwatchConfig(): void {
	if (watchedPath) {
		unwatchFile(watchedPath)
		watchedPath = null
		watchCallback = null
	}
}

export function mergeWithEnv(config: OpenMotokoConfig): OpenMotokoConfig {
	const merged = { ...config }

	if (process.env.OPENMOTOKO_PORT) {
		merged.gateway = { ...merged.gateway, port: parseInt(process.env.OPENMOTOKO_PORT, 10) }
	}
	if (process.env.OPENMOTOKO_BIND) {
		merged.gateway = {
			...merged.gateway,
			bind: process.env.OPENMOTOKO_BIND as 'loopback' | '0.0.0.0',
		}
	}
	if (process.env.OPENMOTOKO_PASSWORD) {
		merged.gateway = {
			...merged.gateway,
			auth: { ...merged.gateway.auth, password: process.env.OPENMOTOKO_PASSWORD },
		}
	}

	return merged
}

export function getConfigDir(): string {
	return CONFIG_DIR
}
