import { SendHorizontal } from 'lucide-react'
import { type KeyboardEvent, useCallback, useRef, useState } from 'react'

interface InputBarProps {
	onSend: (content: string) => void
	disabled?: boolean
}

export function InputBar({ onSend, disabled = false }: InputBarProps) {
	const [value, setValue] = useState('')
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const handleResize = useCallback(() => {
		const el = textareaRef.current
		if (!el) return
		el.style.height = 'auto'
		el.style.height = `${Math.min(el.scrollHeight, 200)}px`
	}, [])

	const handleSend = useCallback(() => {
		const trimmed = value.trim()
		if (!trimmed || disabled) return
		onSend(trimmed)
		setValue('')
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto'
		}
	}, [value, disabled, onSend])

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
				e.preventDefault()
				handleSend()
			}
		},
		[handleSend],
	)

	return (
		<div className="flex items-end gap-3 p-4 border-t border-[var(--border-default)] bg-shell/80 backdrop-blur-sm">
			<div className="flex-1 relative">
				<textarea
					ref={textareaRef}
					value={value}
					onChange={(e) => {
						setValue(e.target.value)
						handleResize()
					}}
					onKeyDown={handleKeyDown}
					placeholder={disabled ? '' : 'Message OpenMotoko...'}
					disabled={disabled}
					rows={1}
					className="w-full bg-void text-chrome font-body text-sm resize-none px-4 py-3 border border-[var(--border-default)] focus:border-ghost focus:shadow-[0_0_0_1px_var(--ghost-border)] outline-none transition-[border-color,box-shadow] placeholder:text-static cut-tr"
					style={{ '--cut-md': '8px', maxHeight: '200px' } as React.CSSProperties}
				/>
				{disabled && (
					<div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-static font-ui text-sm">
						<span>Thinking</span>
						<span
							className="inline-block w-[0.6em] h-[1.1em] bg-ghost align-text-bottom"
							style={{ animation: 'cursor-blink 1s step-end infinite' }}
						/>
					</div>
				)}
			</div>

			<button
				type="button"
				onClick={handleSend}
				disabled={disabled || !value.trim()}
				className={`
					flex items-center justify-center w-10 h-10 flex-shrink-0 cut-tr transition-all
					${
						disabled || !value.trim()
							? 'bg-[rgba(74,96,112,0.15)] text-static cursor-not-allowed'
							: 'bg-ghost text-void hover:bg-ghost-hover hover:drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]'
					}
				`}
				style={{ '--cut-md': '8px' } as React.CSSProperties}
				aria-label="Send message"
			>
				<SendHorizontal size={16} />
			</button>
		</div>
	)
}
