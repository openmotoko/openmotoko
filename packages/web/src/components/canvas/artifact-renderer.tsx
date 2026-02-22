import { CodeEditor } from './code-editor'
import { HtmlPreview } from './html-preview'
import { MarkdownViewer } from './markdown-viewer'
import { MermaidRenderer } from './mermaid-renderer'

interface ArtifactRendererProps {
	type: string
	content: string
	language: string | null
	title: string
}

export function ArtifactRenderer({ type, content, language, title }: ArtifactRendererProps) {
	switch (type) {
		case 'code':
			return <CodeEditor content={content} language={language ?? 'text'} />
		case 'markdown':
			return <MarkdownViewer content={content} />
		case 'html':
			return <HtmlPreview content={content} title={title} />
		case 'mermaid':
			return <MermaidRenderer content={content} />
		default:
			return (
				<pre className="font-code text-sm text-chrome whitespace-pre-wrap leading-relaxed">
					{content}
				</pre>
			)
	}
}
