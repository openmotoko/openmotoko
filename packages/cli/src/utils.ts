import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const CONFIG_DIR = join(homedir(), '.openmotoko')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

interface CliConfig {
	apiUrl?: string
	apiToken?: string
	[key: string]: unknown
}

export function getApiUrl(): string {
	return process.env.OPENMOTOKO_API_URL ?? 'http://localhost:3457'
}

export async function apiRequest<T = unknown>(
	path: string,
	options: RequestInit = {},
): Promise<T> {
	const config = await readConfig()
	const baseUrl = config.apiUrl ?? getApiUrl()
	const url = `${baseUrl}${path}`

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(options.headers as Record<string, string> | undefined),
	}

	if (config.apiToken) {
		headers['Authorization'] = `Bearer ${config.apiToken}`
	}

	const response = await fetch(url, {
		...options,
		headers,
	})

	if (!response.ok) {
		const body = await response.json().catch(() => null)
		const message = (body as { error?: string })?.error ?? `HTTP ${response.status}`
		throw new Error(message)
	}

	return response.json() as Promise<T>
}

export async function readConfig(): Promise<CliConfig> {
	try {
		const raw = await readFile(CONFIG_FILE, 'utf-8')
		return JSON.parse(raw) as CliConfig
	} catch {
		return {}
	}
}

export async function writeConfig(config: CliConfig): Promise<void> {
	await mkdir(CONFIG_DIR, { recursive: true })
	await writeFile(CONFIG_FILE, JSON.stringify(config, null, '\t'), 'utf-8')
}

export function formatTable(rows: string[][]): string {
	if (rows.length === 0) return ''

	const colWidths: number[] = []
	for (const row of rows) {
		for (let i = 0; i < row.length; i++) {
			colWidths[i] = Math.max(colWidths[i] ?? 0, row[i].length)
		}
	}

	return rows
		.map((row) =>
			row.map((cell, i) => cell.padEnd(colWidths[i])).join('  '),
		)
		.join('\n')
}

export function getPidFilePath(): string {
	return join(CONFIG_DIR, 'gateway.pid')
}

export function getConfigDir(): string {
	return CONFIG_DIR
}

export function getDbPath(): string {
	return process.env.OPENMOTOKO_DB_PATH ?? join(CONFIG_DIR, 'openmotoko.db')
}
