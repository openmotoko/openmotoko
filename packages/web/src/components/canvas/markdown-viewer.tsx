import { useMemo } from 'react'

interface MarkdownViewerProps {
	content: string
}

function renderMarkdown(md: string): string {
	let html = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

	html = html.replace(
		/^### (.+)$/gm,
		'<h3 class="text-lg font-display font-bold text-chrome mt-6 mb-2">$1</h3>',
	)
	html = html.replace(
		/^## (.+)$/gm,
		'<h2 class="text-xl font-display font-bold text-chrome mt-8 mb-3">$1</h2>',
	)
	html = html.replace(
		/^# (.+)$/gm,
		'<h1 class="text-2xl font-display font-bold text-chrome mt-8 mb-4">$1</h1>',
	)

	html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
		return `<pre class="bg-panel border border-(--border-default) p-4 my-4 overflow-x-auto cut-corners-sm"><code class="font-code text-sm text-chrome">${code.trim()}</code></pre>`
	})

	html = html.replace(
		/`([^`]+)`/g,
		'<code class="px-1.5 py-0.5 bg-panel text-ghost font-code text-sm">$1</code>',
	)

	html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-chrome">$1</strong>')
	html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-chrome/80">$1</em>')

	html = html.replace(
		/^- (.+)$/gm,
		'<li class="ml-4 text-sm text-chrome/90 font-body list-disc">$1</li>',
	)
	html = html.replace(
		/^\d+\. (.+)$/gm,
		'<li class="ml-4 text-sm text-chrome/90 font-body list-decimal">$1</li>',
	)

	html = html.replace(
		/\[([^\]]+)\]\(([^)]+)\)/g,
		'<a href="$2" target="_blank" rel="noopener" class="text-ghost hover:text-ghost-hover underline">$1</a>',
	)

	html = html.replace(/^---$/gm, '<hr class="border-(--border-default) my-6" />')

	html = html.replace(
		/\n\n/g,
		'</p><p class="text-sm text-chrome/90 font-body leading-relaxed mb-4">',
	)

	return `<p class="text-sm text-chrome/90 font-body leading-relaxed mb-4">${html}</p>`
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
	const html = useMemo(() => renderMarkdown(content), [content])

	return (
		// biome-ignore lint/security/noDangerouslySetInnerHtml: markdown rendering requires innerHTML
		<div className="prose-cyber max-w-3xl mx-auto" dangerouslySetInnerHTML={{ __html: html }} />
	)
}
