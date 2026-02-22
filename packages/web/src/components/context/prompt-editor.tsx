import { Save } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface PromptEditorProps {
	value: string
	onSave: (prompt: string) => void
}

export function PromptEditor({ value, onSave }: PromptEditorProps) {
	const [draft, setDraft] = useState(value)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const dirty = draft !== value

	useEffect(() => {
		setDraft(value)
	}, [value])

	const resize = useCallback(() => {
		const el = textareaRef.current
		if (!el) return
		el.style.height = 'auto'
		el.style.height = `${Math.min(el.scrollHeight, 240)}px`
	}, [])

	useEffect(() => {
		resize()
	}, [resize])

	return (
		<div className="space-y-2">
			<textarea
				ref={textareaRef}
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				rows={3}
				className="w-full bg-void text-chrome font-code text-xs resize-none px-3 py-2.5 border border-(--border-default) focus:border-ghost focus:shadow-[0_0_0_1px_var(--ghost-border)] outline-none transition-[border-color,box-shadow] leading-relaxed"
				style={{ maxHeight: '240px' }}
				placeholder="System prompt..."
			/>
			<div className="flex items-center justify-between">
				<span className="text-[10px] font-code text-static">{draft.length} chars</span>
				{dirty && (
					<button
						type="button"
						onClick={() => onSave(draft)}
						className="flex items-center gap-1.5 px-2.5 py-1 bg-ghost-muted text-ghost text-xs font-ui hover:bg-ghost hover:text-void transition-colors cut-tr"
						style={{ '--cut-md': '4px' } as React.CSSProperties}
					>
						<Save size={12} />
						<span>Save</span>
					</button>
				)}
			</div>
		</div>
	)
}
