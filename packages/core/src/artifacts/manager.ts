import { and, desc, eq } from 'drizzle-orm'
import { getDb } from '../db/index.js'
import { artifacts, artifactVersions } from './schema.js'
import type {
	Artifact,
	ArtifactVersion,
	CreateArtifactInput,
	UpdateArtifactInput,
} from './types.js'

export class ArtifactManager {
	async create(input: CreateArtifactInput): Promise<Artifact> {
		const db = getDb()
		const [artifact] = await db
			.insert(artifacts)
			.values({
				conversationId: input.conversationId,
				type: input.type,
				title: input.title,
				content: input.content,
				language: input.language ?? null,
			})
			.returning()

		await db.insert(artifactVersions).values({
			artifactId: artifact.id,
			version: 1,
			content: input.content,
		})

		return artifact as Artifact
	}

	async update(id: string, input: UpdateArtifactInput): Promise<Artifact> {
		const db = getDb()
		const existing = await db.select().from(artifacts).where(eq(artifacts.id, id)).get()
		if (!existing) {
			throw new Error(`Artifact ${id} not found`)
		}

		const nextVersion = existing.version + 1

		const [updated] = await db
			.update(artifacts)
			.set({
				content: input.content,
				title: input.title ?? existing.title,
				type: input.type ?? existing.type,
				language: input.language !== undefined ? input.language : existing.language,
				version: nextVersion,
				updatedAt: Date.now(),
			})
			.where(eq(artifacts.id, id))
			.returning()

		await db.insert(artifactVersions).values({
			artifactId: id,
			version: nextVersion,
			content: input.content,
		})

		return updated as Artifact
	}

	async get(id: string): Promise<Artifact | null> {
		const db = getDb()
		const result = await db.select().from(artifacts).where(eq(artifacts.id, id)).get()
		return (result as Artifact) ?? null
	}

	async getByConversation(conversationId: string): Promise<Artifact[]> {
		const db = getDb()
		const rows = await db
			.select()
			.from(artifacts)
			.where(eq(artifacts.conversationId, conversationId))
			.orderBy(desc(artifacts.updatedAt))
			.all()
		return rows as Artifact[]
	}

	async getVersions(artifactId: string): Promise<ArtifactVersion[]> {
		const db = getDb()
		const rows = await db
			.select()
			.from(artifactVersions)
			.where(eq(artifactVersions.artifactId, artifactId))
			.orderBy(desc(artifactVersions.version))
			.all()
		return rows as ArtifactVersion[]
	}

	async getVersion(artifactId: string, version: number): Promise<ArtifactVersion | null> {
		const db = getDb()
		const result = await db
			.select()
			.from(artifactVersions)
			.where(
				and(eq(artifactVersions.artifactId, artifactId), eq(artifactVersions.version, version)),
			)
			.get()
		return (result as ArtifactVersion) ?? null
	}

	async delete(id: string): Promise<void> {
		const db = getDb()
		await db.delete(artifactVersions).where(eq(artifactVersions.artifactId, id))
		await db.delete(artifacts).where(eq(artifacts.id, id))
	}
}

export const artifactManager = new ArtifactManager()
