import { describe, expect, it } from 'vitest'

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

	html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
		const trimmedUrl = (url as string).trim().toLowerCase()
		if (
			trimmedUrl.startsWith('javascript:') ||
			trimmedUrl.startsWith('data:') ||
			trimmedUrl.startsWith('vbscript:')
		) {
			return text as string
		}
		return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-ghost hover:text-ghost-hover underline">${text}</a>`
	})

	html = html.replace(/^---$/gm, '<hr class="border-(--border-default) my-6" />')
	html = html.replace(
		/\n\n/g,
		'</p><p class="text-sm text-chrome/90 font-body leading-relaxed mb-4">',
	)

	return `<p class="text-sm text-chrome/90 font-body leading-relaxed mb-4">${html}</p>`
}

describe('Markdown Renderer Security', () => {
	describe('HTML escaping', () => {
		it('escapes < and >', () => {
			const html = renderMarkdown('<script>alert("xss")</script>')
			expect(html).not.toContain('<script>')
			expect(html).toContain('&lt;script&gt;')
		})

		it('escapes ampersands', () => {
			const html = renderMarkdown('A & B')
			expect(html).toContain('&amp;')
		})
	})

	describe('XSS via links', () => {
		it('blocks javascript: URIs', () => {
			const html = renderMarkdown('[click me](javascript:alert(1))')
			expect(html).not.toContain('javascript:')
			expect(html).toContain('click me')
			expect(html).not.toContain('<a ')
		})

		it('blocks JavaScript: URIs (case insensitive)', () => {
			const html = renderMarkdown('[click](JavaScript:alert(1))')
			expect(html).not.toContain('JavaScript:')
		})

		it('blocks JAVASCRIPT: URIs (uppercase)', () => {
			const html = renderMarkdown('[click](JAVASCRIPT:alert(1))')
			expect(html).not.toContain('JAVASCRIPT:')
		})

		it('blocks data: URIs', () => {
			const html = renderMarkdown('[click](data:text/html,<script>alert(1)</script>)')
			expect(html).not.toContain('data:')
		})

		it('blocks vbscript: URIs', () => {
			const html = renderMarkdown('[click](vbscript:MsgBox("xss"))')
			expect(html).not.toContain('vbscript:')
		})

		it('allows https: URIs', () => {
			const html = renderMarkdown('[Google](https://google.com)')
			expect(html).toContain('href="https://google.com"')
			expect(html).toContain('target="_blank"')
			expect(html).toContain('rel="noopener noreferrer"')
		})

		it('allows http: URIs', () => {
			const html = renderMarkdown('[Local](http://localhost:3000)')
			expect(html).toContain('href="http://localhost:3000"')
		})
	})

	describe('markdown rendering', () => {
		it('renders headings', () => {
			expect(renderMarkdown('# Title')).toContain('<h1')
			expect(renderMarkdown('## Subtitle')).toContain('<h2')
			expect(renderMarkdown('### Section')).toContain('<h3')
		})

		it('renders bold', () => {
			expect(renderMarkdown('**bold**')).toContain('<strong')
		})

		it('renders italic', () => {
			expect(renderMarkdown('*italic*')).toContain('<em')
		})

		it('renders inline code', () => {
			expect(renderMarkdown('use `console.log`')).toContain('<code')
		})

		it('renders code blocks', () => {
			expect(renderMarkdown('```js\nconsole.log("hi")\n```')).toContain('<pre')
		})

		it('renders list items', () => {
			expect(renderMarkdown('- item one')).toContain('<li')
			expect(renderMarkdown('1. numbered')).toContain('<li')
		})
	})
})
