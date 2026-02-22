import { GitBranch } from 'lucide-react'

interface MermaidRendererProps {
	content: string
}

export function MermaidRenderer({ content }: MermaidRendererProps) {
	return (
		<div className="bg-shell border border-(--border-default) cut-corners-sm overflow-hidden">
			<div className="flex items-center gap-2 px-4 py-2 border-b border-(--border-default) bg-panel/50">
				<GitBranch size={14} className="text-ghost" />
				<span className="text-xs font-ui text-chrome">Mermaid Diagram</span>
			</div>
			<div className="p-4">
				<pre className="font-code text-sm text-ghost whitespace-pre-wrap leading-relaxed">
					{content}
				</pre>
			</div>
		</div>
	)
}
