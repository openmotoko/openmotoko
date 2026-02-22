import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

export const registrySkills = sqliteTable('registry_skills', {
	id: text().primaryKey().$defaultFn(() => nanoid()),
	name: text().notNull(),
	version: text().notNull(),
	description: text().notNull(),
	author: text().notNull(),
	repository: text().notNull().default(''),
	downloadUrl: text('download_url').notNull().default(''),
	checksumSha256: text('checksum_sha256').notNull().default(''),
	downloads: integer().notNull().default(0),
	verified: integer().notNull().default(0),
	tags: text().notNull().default('[]'),
	rating: real().notNull().default(0),
	ratingCount: integer('rating_count').notNull().default(0),
	publishedAt: integer('published_at').notNull().$defaultFn(() => Date.now()),
})

export const skillRatings = sqliteTable('skill_ratings', {
	id: text().primaryKey().$defaultFn(() => nanoid()),
	skillId: text('skill_id').notNull().references(() => registrySkills.id),
	userId: text('user_id').notNull(),
	stars: integer().notNull(),
	comment: text().notNull().default(''),
	createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
})

export const securityScans = sqliteTable('security_scans', {
	id: text().primaryKey().$defaultFn(() => nanoid()),
	skillId: text('skill_id').notNull().references(() => registrySkills.id),
	version: text().notNull(),
	passed: integer().notNull().default(0),
	issues: text().notNull().default('[]'),
	scannedAt: integer('scanned_at').notNull().$defaultFn(() => Date.now()),
})

export type RegistrySkill = typeof registrySkills.$inferSelect
export type NewRegistrySkill = typeof registrySkills.$inferInsert
export type SkillRating = typeof skillRatings.$inferSelect
export type SecurityScan = typeof securityScans.$inferSelect
