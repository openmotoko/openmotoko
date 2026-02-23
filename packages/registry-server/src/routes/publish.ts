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
		const apiKey = request.headers['x-api-key'] as string | undefined
		const expectedKey = process.env.REGISTRY_API_KEY
		if (!expectedKey) {
			return reply.status(503).send({ error: 'Publishing is not configured', code: 'UNAVAILABLE' })
		}
		if (!apiKey || apiKey !== expectedKey) {
			return reply.status(401).send({ error: 'Invalid or missing API key', code: 'UNAUTHORIZED' })
		}

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
			execSync(
				'tar -xzf package.tar.gz --strip-components=1 --no-same-owner --no-same-permissions 2>&1 | head -c 4096',
				{ cwd: tmpDir, timeout: 30_000, maxBuffer: 5 * 1024 * 1024 },
			)

			const { readdirSync, lstatSync } = await import('node:fs')
			const checkSymlinks = (dir: string, depth = 0): void => {
				if (depth > 10) return
				for (const entry of readdirSync(dir)) {
					const fullPath = join(dir, entry)
					const stat = lstatSync(fullPath)
					if (stat.isSymbolicLink()) {
						throw new Error(`Symlinks are not allowed in skill packages: ${entry}`)
					}
					if (stat.isDirectory()) {
						checkSymlinks(fullPath, depth + 1)
					}
				}
			}
			checkSymlinks(tmpDir)

			const manifestPath = join(tmpDir, 'manifest.json')
			if (!existsSync(manifestPath)) {
				return reply.status(400).send({ error: 'No manifest.json in package' })
			}

			const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
			if (!manifest.id || !manifest.name || !manifest.version) {
				return reply.status(400).send({ error: 'Invalid manifest: missing id, name, or version' })
			}

			const scanResult = await runSecurityScan(tmpDir, manifest)

			if (scanResult.grade === 'F') {
				return reply.status(422).send({
					error: 'Security scan failed',
					code: 'SCAN_REJECTED',
					grade: scanResult.grade,
					score: scanResult.score,
					findings: scanResult.findings,
				})
			}

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
					passed: 1,
					grade: scanResult.grade,
					score: scanResult.score,
					issues: JSON.stringify(scanResult.findings),
					findings: JSON.stringify(scanResult.findings),
					scannedFiles: scanResult.scannedFiles,
					totalLines: scanResult.totalLines,
					scanDuration: scanResult.scanDuration,
					scannedAt: Date.now(),
				})
				.run()

			return reply.status(201).send({
				id: skillId,
				name: manifest.name,
				version: manifest.version,
				checksum,
				securityScan: {
					grade: scanResult.grade,
					score: scanResult.score,
					findings: scanResult.findings,
					scannedFiles: scanResult.scannedFiles,
					totalLines: scanResult.totalLines,
					scanDuration: scanResult.scanDuration,
				},
			})
		} finally {
			rmSync(tmpDir, { recursive: true, force: true })
		}
	})

	fastify.delete('/api/skills/:id', async (request, reply) => {
		const apiKey = request.headers['x-api-key'] as string | undefined
		const expectedKey = process.env.REGISTRY_API_KEY
		if (!expectedKey) {
			return reply.status(503).send({ error: 'Not configured', code: 'UNAVAILABLE' })
		}
		if (!apiKey || apiKey !== expectedKey) {
			return reply.status(401).send({ error: 'Invalid API key', code: 'UNAUTHORIZED' })
		}
		const { id } = request.params as { id: string }
		const db = getRegistryDb()
		const [skill] = db.select().from(registrySkills).where(eq(registrySkills.id, id)).all()
		if (!skill) {
			return reply.status(404).send({ error: 'Skill not found', code: 'NOT_FOUND' })
		}
		if (existsSync(skill.downloadUrl)) {
			(await import('node:fs')).unlinkSync(skill.downloadUrl)
		}
		db.delete(registrySkills).where(eq(registrySkills.id, id)).run()
		return reply.status(204).send()
	})

	fastify.get('/api/skills/:id/download', async (request, reply) => {
		const { id } = request.params as { id: string }
		const db = getRegistryDb()
		const [skill] = db.select().from(registrySkills).where(eq(registrySkills.id, id)).all()
		if (!skill) {
			return reply.status(404).send({ error: 'Skill not found', code: 'NOT_FOUND' })
		}
		if (!existsSync(skill.downloadUrl)) {
			return reply.status(404).send({ error: 'Package file not found', code: 'NOT_FOUND' })
		}
		const stream = (await import('node:fs')).createReadStream(skill.downloadUrl)
		return reply
			.header('Content-Type', 'application/gzip')
			.header('Content-Disposition', `attachment; filename="${id}-${skill.version}.tar.gz"`)
			.send(stream)
	})
}
