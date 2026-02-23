import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import * as schema from './schema.js'

let db: ReturnType<typeof drizzle> | null = null

export function initDb(): void {
	const dir = process.env.REGISTRY_DB_PATH
		? process.env.REGISTRY_DB_PATH
		: join(homedir(), '.openmotoko', 'registry')

	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true })
	}

	const dbPath = dir.endsWith('.db') ? dir : join(dir, 'registry.db')
	const sqlite = new Database(dbPath)
	sqlite.pragma('journal_mode = WAL')
	sqlite.pragma('foreign_keys = ON')

	db = drizzle(sqlite, { schema })

	sqlite.exec(`
		CREATE TABLE IF NOT EXISTS registry_skills (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			version TEXT NOT NULL,
			description TEXT NOT NULL,
			author TEXT NOT NULL,
			repository TEXT NOT NULL DEFAULT '',
			download_url TEXT NOT NULL DEFAULT '',
			checksum_sha256 TEXT NOT NULL DEFAULT '',
			downloads INTEGER NOT NULL DEFAULT 0,
			verified INTEGER NOT NULL DEFAULT 0,
			tags TEXT NOT NULL DEFAULT '[]',
			rating REAL NOT NULL DEFAULT 0,
			rating_count INTEGER NOT NULL DEFAULT 0,
			published_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS skill_ratings (
			id TEXT PRIMARY KEY,
			skill_id TEXT NOT NULL REFERENCES registry_skills(id),
			user_id TEXT NOT NULL,
			stars INTEGER NOT NULL CHECK(stars >= 1 AND stars <= 5),
			comment TEXT NOT NULL DEFAULT '',
			created_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS security_scans (
			id TEXT PRIMARY KEY,
			skill_id TEXT NOT NULL REFERENCES registry_skills(id),
			version TEXT NOT NULL,
			passed INTEGER NOT NULL DEFAULT 0,
			grade TEXT NOT NULL DEFAULT '',
			score INTEGER NOT NULL DEFAULT 0,
			issues TEXT NOT NULL DEFAULT '[]',
			findings TEXT NOT NULL DEFAULT '[]',
			scanned_files INTEGER NOT NULL DEFAULT 0,
			total_lines INTEGER NOT NULL DEFAULT 0,
			scan_duration INTEGER NOT NULL DEFAULT 0,
			scanned_at INTEGER NOT NULL
		);

		CREATE INDEX IF NOT EXISTS idx_ratings_skill ON skill_ratings(skill_id);
		CREATE INDEX IF NOT EXISTS idx_scans_skill ON security_scans(skill_id);
	`)
}

export function getRegistryDb() {
	if (!db) throw new Error('Registry DB not initialized')
	return db
}
