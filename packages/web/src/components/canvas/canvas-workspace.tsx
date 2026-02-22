import { useQuery } from '@tanstack/react-query'
import { Layers } from 'lucide-react'
import { api } from '../../lib/api'
import { ArtifactRenderer } from './artifact-renderer'
import { ArtifactToolbar } from './artifact-toolbar'

interface CanvasWorkspaceProps {
	artifactId: string | null
}

export function CanvasWorkspace({ artifactId }: CanvasWorkspaceProps) {
	const { data: artifact, isLoading } = useQuery({
		queryKey: ['artifact', artifactId],
		queryFn: () => api.getArtifact(artifactId as string),
		enabled: !!artifactId,
	})

	if (!artifactId) {
		return (
			<div className="flex-1 flex items-center justify-center bg-void">
				<div className="text-center space-y-3">
					<Layers size={40} className="mx-auto text-static/30" />
					<p className="text-sm font-ui text-static/60">Select an artifact to view</p>
					<p className="text-xs font-body text-static/40 max-w-xs">
						Artifacts are created by the agent during conversations. Ask it to write code, create
						documents, or generate diagrams.
					</p>
				</div>
			</div>
		)
	}

	if (isLoading) {
		return (
			<div className="flex-1 flex items-center justify-center bg-void">
				<div className="w-8 h-8 border-2 border-ghost/30 border-t-ghost rounded-full animate-spin" />
			</div>
		)
	}

	const a = artifact as Record<string, unknown> | undefined
	if (!a) return null

	return (
		<div className="flex-1 flex flex-col bg-void min-w-0">
			<ArtifactToolbar artifact={a} />
			<div className="flex-1 overflow-auto p-4">
				<ArtifactRenderer
					type={(a.type as string) ?? 'text'}
					content={(a.content as string) ?? ''}
					language={(a.language as string) ?? null}
					title={(a.title as string) ?? ''}
				/>
			</div>
		</div>
	)
}
