import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { getDb } from './client.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsFolder = resolve(__dirname, '../../drizzle')

export function runMigrations() {
	const db = getDb()
	migrate(db, { migrationsFolder })
}

const isMainModule = process.argv[1] && resolve(process.argv[1]).includes('migrate')

if (isMainModule) {
	runMigrations()
	console.log('Migrations applied successfully')
}
