import { useMemo } from 'react'

interface CodeEditorProps {
	content: string
	language: string
}

export function CodeEditor({ content, language }: CodeEditorProps) {
	const lines = useMemo(() => content.split('\n'), [content])

	return (
		<div className="bg-shell border border-(--border-default) cut-corners-sm overflow-hidden">
			<div className="flex items-center justify-between px-4 py-2 border-b border-(--border-default) bg-panel/50">
				<span className="text-xs font-mono text-ghost">{language}</span>
				<span className="text-xs text-static/40">{lines.length} lines</span>
			</div>
			<div className="overflow-auto max-h-[calc(100vh-200px)]">
				<table className="w-full border-collapse">
					<tbody>
						{lines.map((line, i) => (
							<tr key={`line-${i}-${line.length}`} className="hover:bg-panel/30">
								<td className="px-3 py-0 text-right text-xs font-mono text-static/30 select-none w-12 align-top">
									{i + 1}
								</td>
								<td className="px-4 py-0">
									<pre className="font-code text-sm text-chrome whitespace-pre">{line || ' '}</pre>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
