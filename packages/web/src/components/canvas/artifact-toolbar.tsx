import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Clock, Copy, Download, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { api } from '../../lib/api'

interface ArtifactToolbarProps {
	artifact: Record<string, unknown>
}

export function ArtifactToolbar({ artifact }: ArtifactToolbarProps) {
	const queryClient = useQueryClient()
	const navigate = useNavigate()
	const [copied, setCopied] = useState(false)
	const [showVersions, setShowVersions] = useState(false)

	const id = artifact.id as string
	const title = (artifact.title as string) ?? 'Untitled'
	const type = (artifact.type as string) ?? 'text'
	const version = artifact.version as number
	const language = artifact.language as string | null

	const { data: versions } = useQuery({
		queryKey: ['artifact-versions', id],
		queryFn: () => api.getArtifactVersions(id),
		enabled: showVersions,
	})

	const deleteMutation = useMutation({
		mutationFn: () => api.deleteArtifact(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['artifacts'] })
			navigate('/canvas')
		},
	})

	const copyContent = useCallback(async () => {
		await navigator.clipboard.writeText((artifact.content as string) ?? '')
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}, [artifact.content])

	const downloadContent = useCallback(() => {
		const content = (artifact.content as string) ?? ''
		const ext =
			type === 'code'
				? (language ?? 'txt')
				: type === 'markdown'
					? 'md'
					: type === 'html'
						? 'html'
						: 'txt'
		const blob = new Blob([content], { type: 'text/plain' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `${title.replace(/\s+/g, '-').toLowerCase()}.${ext}`
		a.click()
		URL.revokeObjectURL(url)
	}, [artifact.content, title, type, language])

	return (
		<div className="relative flex items-center justify-between px-4 py-2 border-b border-(--border-default) bg-shell/50 backdrop-blur-sm">
			<div className="flex items-center gap-3 min-w-0">
				<h3 className="text-sm font-ui font-semibold text-chrome truncate">{title}</h3>
				<span className="text-xs font-mono text-ghost/60 shrink-0">{type}</span>
				{language && <span className="text-xs font-mono text-static shrink-0">{language}</span>}
				<span className="text-xs text-static/40 shrink-0">v{version}</span>
			</div>

			<div className="flex items-center gap-1">
				<button
					type="button"
					onClick={copyContent}
					className="p-1.5 text-static hover:text-chrome transition-colors"
					aria-label="Copy content"
				>
					{copied ? <Check size={14} className="text-alive" /> : <Copy size={14} />}
				</button>
				<button
					type="button"
					onClick={downloadContent}
					className="p-1.5 text-static hover:text-chrome transition-colors"
					aria-label="Download"
				>
					<Download size={14} />
				</button>
				<button
					type="button"
					onClick={() => setShowVersions(!showVersions)}
					className={`p-1.5 transition-colors ${showVersions ? 'text-ghost' : 'text-static hover:text-chrome'}`}
					aria-label="Version history"
				>
					<Clock size={14} />
				</button>
				<button
					type="button"
					onClick={() => deleteMutation.mutate()}
					className="p-1.5 text-static hover:text-pulse transition-colors"
					aria-label="Delete artifact"
				>
					<Trash2 size={14} />
				</button>
			</div>

			{showVersions && versions && (
				<div className="absolute right-4 top-12 z-20 w-48 bg-panel border border-(--border-default) cut-corners-sm shadow-lg">
					<div className="p-2">
						<p className="text-xs font-ui font-semibold text-static uppercase mb-1">Versions</p>
						{(versions as Array<Record<string, unknown>>).map((v) => (
							<div key={v.id as string} className="flex items-center justify-between py-1 text-xs">
								<span className="font-mono text-chrome">v{v.version as number}</span>
								<span className="text-static/60">
									{new Date((v.createdAt as number) ?? 0).toLocaleString()}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
