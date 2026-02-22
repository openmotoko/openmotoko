import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.js'

const DEFAULT_DB_PATH = './data/openmotoko.db'

export function createDb(path?: string) {
	const dbPath = path ?? process.env.OPENMOTOKO_DB_PATH ?? DEFAULT_DB_PATH
	mkdirSync(dirname(dbPath), { recursive: true })
	const sqlite = new Database(dbPath)
	sqlite.pragma('journal_mode = WAL')
	sqlite.pragma('foreign_keys = ON')
	return drizzle({ client: sqlite, schema })
}

export type DbInstance = ReturnType<typeof createDb>

let instance: DbInstance | null = null

export function getDb() {
	if (!instance) {
		instance = createDb()
	}
	return instance
}
