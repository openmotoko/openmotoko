import { existsSync, mkdirSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as actionlogSchema from '../actionlog/schema.js'
import * as artifactsSchema from '../artifacts/schema.js'
import * as autonomySchema from '../autonomy/schema.js'
import * as intentsSchema from '../intents/schema.js'
import * as memorySchema from '../memory/schema.js'
import * as ragSchema from '../rag/schema.js'
import * as schedulerSchema from '../scheduler/schema.js'
import * as sessionsSchema from '../sessions/schema.js'
import * as webhooksSchema from '../webhooks/schema.js'
import * as schema from './schema.js'

const allSchemas = {
	...schema,
	...sessionsSchema,
	...artifactsSchema,
	...memorySchema,
	...schedulerSchema,
	...ragSchema,
	...webhooksSchema,
	...actionlogSchema,
	...autonomySchema,
	...intentsSchema,
}

const DEFAULT_DB_PATH = './data/openmotoko.db'

function findProjectRoot(): string {
	let dir = process.cwd()
	while (dir !== dirname(dir)) {
		if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir
		dir = dirname(dir)
	}
	return process.cwd()
}

export function createDb(path?: string) {
	const raw = path ?? process.env.OPENMOTOKO_DB_PATH ?? DEFAULT_DB_PATH
	const dbPath = isAbsolute(raw) ? raw : resolve(findProjectRoot(), raw)
	mkdirSync(dirname(dbPath), { recursive: true })
	const sqlite = new Database(dbPath)
	sqlite.pragma('journal_mode = WAL')
	sqlite.pragma('foreign_keys = ON')
	return drizzle({ client: sqlite, schema: allSchemas })
}

export type DbInstance = ReturnType<typeof createDb>

let instance: DbInstance | null = null

export function getDb() {
	if (!instance) {
		instance = createDb()
	}
	return instance
}
