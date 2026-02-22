import { File, FileCode, FileText, GitBranch, Globe } from 'lucide-react'
import { useNavigate } from 'react-router'

interface ArtifactListProps {
	artifacts: Array<Record<string, unknown>>
	activeId: string | null
}

const typeIcons: Record<string, typeof FileCode> = {
	code: FileCode,
	markdown: FileText,
	html: Globe,
	mermaid: GitBranch,
	text: File,
}

export function ArtifactList({ artifacts, activeId }: ArtifactListProps) {
	const navigate = useNavigate()

	return (
		<div className="w-56 shrink-0 border-r border-(--border-default) bg-shell overflow-y-auto">
			<div className="p-3 border-b border-(--border-default)">
				<h2 className="text-xs font-ui font-semibold text-static uppercase tracking-wider">
					Artifacts
				</h2>
			</div>

			{artifacts.length === 0 ? (
				<div className="p-4 text-center">
					<p className="text-xs text-static/60 font-body">
						No artifacts yet. Ask the agent to create one.
					</p>
				</div>
			) : (
				<div className="py-1">
					{artifacts.map((artifact) => {
						const id = artifact.id as string
						const type = (artifact.type as string) ?? 'text'
						const title = (artifact.title as string) ?? 'Untitled'
						const language = artifact.language as string | null
						const version = artifact.version as number
						const Icon = typeIcons[type] ?? File
						const isActive = id === activeId

						return (
							<button
								key={id}
								type="button"
								onClick={() => navigate(`/canvas/${id}`)}
								className={`w-full flex items-start gap-2 px-3 py-2 text-left transition-colors ${
									isActive
										? 'bg-ghost/10 border-l-2 border-ghost'
										: 'hover:bg-panel border-l-2 border-transparent'
								}`}
							>
								<Icon
									size={14}
									className={`mt-0.5 shrink-0 ${isActive ? 'text-ghost' : 'text-static'}`}
								/>
								<div className="min-w-0 flex-1">
									<p
										className={`text-xs font-ui truncate ${isActive ? 'text-chrome' : 'text-static'}`}
									>
										{title}
									</p>
									<div className="flex items-center gap-1.5 mt-0.5">
										{language && (
											<span className="text-[10px] font-mono text-ghost/60">{language}</span>
										)}
										<span className="text-[10px] text-static/40">v{version}</span>
									</div>
								</div>
							</button>
						)
					})}
				</div>
			)}
		</div>
	)
}
