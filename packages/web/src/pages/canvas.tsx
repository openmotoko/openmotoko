import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { ArtifactList } from '../components/canvas/artifact-list'
import { CanvasWorkspace } from '../components/canvas/canvas-workspace'
import { api } from '../lib/api'
import { useStore } from '../lib/store'

export function CanvasPage() {
	const { id: artifactId } = useParams()
	const activeConversationId = useStore((s) => s.activeConversationId)

	const { data: artifacts } = useQuery({
		queryKey: ['artifacts', activeConversationId],
		queryFn: () => (activeConversationId ? api.getArtifacts(activeConversationId) : []),
		enabled: !!activeConversationId,
	})

	return (
		<div className="flex h-full">
			<ArtifactList
				artifacts={(artifacts as Array<Record<string, unknown>>) ?? []}
				activeId={artifactId ?? null}
			/>
			<CanvasWorkspace artifactId={artifactId ?? null} />
		</div>
	)
}
