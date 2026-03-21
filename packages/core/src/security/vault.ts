import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'
import { getDb } from '../db/index.js'

export const secretsVault = sqliteTable('secrets_vault', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	key: text().notNull().unique(),
	encryptedValue: text().notNull(),
	iv: text().notNull(),
	authTag: text().notNull(),
	salt: text().notNull(),
	createdAt: integer()
		.notNull()
		.$defaultFn(() => Date.now()),
	rotatedAt: integer(),
})

export type SecretVaultRow = typeof secretsVault.$inferSelect

const KEY_LENGTH = 32 // AES-256
const IV_LENGTH = 12 // GCM recommended
const PBKDF2_ITERATIONS = 100_000
const SALT_LENGTH = 32

export class SecretVault {
	private masterKey: string

	constructor(masterKey: string) {
		if (!masterKey || masterKey.length < 8) {
			throw new Error('Master key must be at least 8 characters')
		}
		this.masterKey = masterKey
	}

	private deriveKey(salt: Buffer): Buffer {
		return pbkdf2Sync(this.masterKey, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512')
	}

	private encrypt(
		plaintext: string,
		salt: Buffer,
	): { ciphertext: string; iv: string; authTag: string } {
		const key = this.deriveKey(salt)
		const iv = randomBytes(IV_LENGTH)
		const cipher = createCipheriv('aes-256-gcm', key, iv)

		let encrypted = cipher.update(plaintext, 'utf8', 'hex')
		encrypted += cipher.final('hex')
		const authTag = cipher.getAuthTag()

		return {
			ciphertext: encrypted,
			iv: iv.toString('hex'),
			authTag: authTag.toString('hex'),
		}
	}

	private decrypt(ciphertext: string, ivHex: string, authTagHex: string, salt: Buffer): string {
		const key = this.deriveKey(salt)
		const iv = Buffer.from(ivHex, 'hex')
		const authTag = Buffer.from(authTagHex, 'hex')
		const decipher = createDecipheriv('aes-256-gcm', key, iv)
		decipher.setAuthTag(authTag)

		let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
		decrypted += decipher.final('utf8')

		return decrypted
	}

	private db() {
		return getDb()
	}

	async store(key: string, secret: string): Promise<void> {
		const db = this.db()
		const salt = randomBytes(SALT_LENGTH)
		const { ciphertext, iv, authTag } = this.encrypt(secret, salt)
		const now = Date.now()

		// Upsert: delete existing then insert
		await db.delete(secretsVault).where(eq(secretsVault.key, key))
		await db.insert(secretsVault).values({
			id: nanoid(),
			key,
			encryptedValue: ciphertext,
			iv,
			authTag,
			salt: salt.toString('hex'),
			createdAt: now,
			rotatedAt: null,
		})
	}

	async retrieve(key: string): Promise<string | null> {
		const db = this.db()
		const rows = await db.select().from(secretsVault).where(eq(secretsVault.key, key)).limit(1)

		if (rows.length === 0) return null

		const row = rows[0]
		const salt = Buffer.from(row.salt, 'hex')
		return this.decrypt(row.encryptedValue, row.iv, row.authTag, salt)
	}

	async delete(key: string): Promise<void> {
		const db = this.db()
		await db.delete(secretsVault).where(eq(secretsVault.key, key))
	}

	async list(): Promise<{ key: string; createdAt: number; rotatedAt: number | null }[]> {
		const db = this.db()
		const rows = await db
			.select({
				key: secretsVault.key,
				createdAt: secretsVault.createdAt,
				rotatedAt: secretsVault.rotatedAt,
			})
			.from(secretsVault)

		return rows
	}

	async rotate(key: string, newSecret: string): Promise<void> {
		const db = this.db()
		const salt = randomBytes(SALT_LENGTH)
		const { ciphertext, iv, authTag } = this.encrypt(newSecret, salt)
		const now = Date.now()

		const existing = await db.select().from(secretsVault).where(eq(secretsVault.key, key)).limit(1)

		if (existing.length === 0) {
			throw new Error(`Secret "${key}" not found`)
		}

		await db
			.update(secretsVault)
			.set({
				encryptedValue: ciphertext,
				iv,
				authTag,
				salt: salt.toString('hex'),
				rotatedAt: now,
			})
			.where(eq(secretsVault.key, key))
	}

	async getStaleSecrets(maxAgeDays: number = 90): Promise<string[]> {
		const db = this.db()
		const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000

		const rows = await db
			.select({
				key: secretsVault.key,
				createdAt: secretsVault.createdAt,
				rotatedAt: secretsVault.rotatedAt,
			})
			.from(secretsVault)

		return rows
			.filter((row) => {
				const lastTouched = row.rotatedAt ?? row.createdAt
				return lastTouched < cutoff
			})
			.map((row) => row.key)
	}
}
