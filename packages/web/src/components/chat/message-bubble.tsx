import type { Message } from '../../lib/api'
import { ThoughtProcess } from './thought-process'

interface MessageBubbleProps {
	message: Message
}

function renderMarkdown(content: string) {
	const parts: React.ReactNode[] = []
	const lines = content.split('\n')
	let inCodeBlock = false
	let codeBuffer: string[] = []
	let _codeLang = ''

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]

		if (line.startsWith('```')) {
			if (inCodeBlock) {
				parts.push(
					<pre
						key={`code-${i}`}
						className="bg-void/60 border border-[var(--border-default)] p-3 my-2 overflow-x-auto text-xs font-code text-chrome"
					>
						<code>{codeBuffer.join('\n')}</code>
					</pre>,
				)
				codeBuffer = []
				inCodeBlock = false
			} else {
				inCodeBlock = true
				_codeLang = line.slice(3).trim()
			}
			continue
		}

		if (inCodeBlock) {
			codeBuffer.push(line)
			continue
		}

		if (line.startsWith('### ')) {
			parts.push(
				<h3 key={i} className="font-display font-semibold text-sm text-chrome mt-3 mb-1">
					{line.slice(4)}
				</h3>,
			)
		} else if (line.startsWith('## ')) {
			parts.push(
				<h2 key={i} className="font-display font-bold text-base text-chrome mt-4 mb-1">
					{line.slice(3)}
				</h2>,
			)
		} else if (line.startsWith('# ')) {
			parts.push(
				<h1 key={i} className="font-display font-bold text-lg text-chrome mt-4 mb-2">
					{line.slice(2)}
				</h1>,
			)
		} else if (line.startsWith('- ') || line.startsWith('* ')) {
			parts.push(
				<li key={i} className="ml-4 text-sm font-body list-disc">
					{renderInline(line.slice(2))}
				</li>,
			)
		} else if (line.trim() === '') {
			parts.push(<br key={i} />)
		} else {
			parts.push(
				<p key={i} className="text-sm font-body leading-relaxed">
					{renderInline(line)}
				</p>,
			)
		}
	}

	return parts
}

function renderInline(text: string) {
	const parts: React.ReactNode[] = []
	const regex = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g
	let lastIndex = 0
	let match = regex.exec(text)

	while (match !== null) {
		if (match.index > lastIndex) {
			parts.push(text.slice(lastIndex, match.index))
		}

		if (match[1]) {
			parts.push(
				<code key={match.index} className="bg-void/60 px-1.5 py-0.5 text-ghost font-code text-xs">
					{match[1]}
				</code>,
			)
		} else if (match[2]) {
			parts.push(
				<strong key={match.index} className="font-semibold text-chrome">
					{match[2]}
				</strong>,
			)
		} else if (match[3]) {
			parts.push(
				<em key={match.index} className="italic">
					{match[3]}
				</em>,
			)
		}

		lastIndex = match.index + match[0].length
		match = regex.exec(text)
	}

	if (lastIndex < text.length) {
		parts.push(text.slice(lastIndex))
	}

	return parts
}

export function MessageBubble({ message }: MessageBubbleProps) {
	const isUser = message.role === 'user'

	return (
		<div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
			<div
				className={`
					max-w-[80%] px-4 py-3 relative
					${isUser ? 'bg-ghost-muted text-chrome cut-tr' : 'bg-shell text-chrome cut-bl cut-border'}
				`}
				style={{ '--cut-md': '10px' } as React.CSSProperties}
				aria-live={isUser ? undefined : 'polite'}
			>
				<div className="flex items-center gap-2 mb-1">
					<span className="text-xs font-ui font-bold uppercase tracking-wider text-static">
						{isUser ? 'You' : 'Agent'}
					</span>
					{message.model && !isUser && (
						<span className="text-xs font-code text-ghost/60 cut-chevron bg-ghost-muted px-2 py-px">
							{message.model}
						</span>
					)}
					<span className="text-xs font-ui text-static ml-auto">
						{new Date(message.createdAt).toLocaleTimeString('en', {
							hour: '2-digit',
							minute: '2-digit',
						})}
					</span>
				</div>

				<div className="space-y-1">{renderMarkdown(message.content)}</div>

				{!isUser && message.toolCalls && message.toolCalls.length > 0 && (
					<ThoughtProcess toolCalls={message.toolCalls} toolResults={message.toolResults} />
				)}
			</div>
		</div>
	)
}
