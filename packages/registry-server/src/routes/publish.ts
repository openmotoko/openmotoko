import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'
import { getRegistryDb } from '../db/client.js'
import { registrySkills, securityScans } from '../db/schema.js'
import { runSecurityScan } from '../services/security-scan.js'

const STORAGE_DIR = join(homedir(), '.openmotoko', 'registry', 'packages')

export default async function publishRoutes(fastify: FastifyInstance) {
	fastify.post('/api/skills/publish', async (request, reply) => {
		const file = await request.file()
		if (!file) return reply.status(400).send({ error: 'No file uploaded' })

		const chunks: Buffer[] = []
		for await (const chunk of file.file) {
			chunks.push(chunk)
		}
		const buffer = Buffer.concat(chunks)
		const checksum = createHash('sha256').update(buffer).digest('hex')

		const tmpDir = join(STORAGE_DIR, '_tmp_' + nanoid())
		mkdirSync(tmpDir, { recursive: true })

		try {
			const archivePath = join(tmpDir, 'package.tar.gz')
			writeFileSync(archivePath, buffer)

			const { execSync } = await import('node:child_process')
			execSync('tar -xzf package.tar.gz --strip-components=1', { cwd: tmpDir })

			const manifestPath = join(tmpDir, 'manifest.json')
			if (!existsSync(manifestPath)) {
				return reply.status(400).send({ error: 'No manifest.json in package' })
			}

			const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
			if (!manifest.id || !manifest.name || !manifest.version) {
				return reply.status(400).send({ error: 'Invalid manifest: missing id, name, or version' })
			}

			const scanResult = await runSecurityScan(tmpDir, manifest)

			const db = getRegistryDb()
			const skillId = manifest.id as string

			if (!existsSync(STORAGE_DIR)) {
				mkdirSync(STORAGE_DIR, { recursive: true })
			}
			const finalPath = join(STORAGE_DIR, `${skillId}-${manifest.version}.tar.gz`)
			writeFileSync(finalPath, buffer)

			const existing = db.select().from(registrySkills).where(eq(registrySkills.id, skillId)).all()

			if (existing.length > 0) {
				db.update(registrySkills)
					.set({
						name: manifest.name,
						version: manifest.version,
						description: manifest.description ?? '',
						author: manifest.author ?? '',
						checksumSha256: checksum,
						downloadUrl: finalPath,
						tags: JSON.stringify(manifest.tags ?? []),
						publishedAt: Date.now(),
					})
					.where(eq(registrySkills.id, skillId))
					.run()
			} else {
				db.insert(registrySkills)
					.values({
						id: skillId,
						name: manifest.name,
						version: manifest.version,
						description: manifest.description ?? '',
						author: manifest.author ?? '',
						checksumSha256: checksum,
						downloadUrl: finalPath,
						tags: JSON.stringify(manifest.tags ?? []),
						publishedAt: Date.now(),
					})
					.run()
			}

			db.insert(securityScans)
				.values({
					id: nanoid(),
					skillId,
					version: manifest.version,
					passed: scanResult.passed ? 1 : 0,
					issues: JSON.stringify(scanResult.issues),
					scannedAt: Date.now(),
				})
				.run()

			return reply.status(201).send({
				id: skillId,
				name: manifest.name,
				version: manifest.version,
				checksum,
				securityScan: scanResult,
			})
		} finally {
			rmSync(tmpDir, { recursive: true, force: true })
		}
	})
}
