import { X } from 'lucide-react'
import { useState } from 'react'

interface PermissionTagListProps {
	tags: string[]
	placeholder: string
	onChange: (tags: string[]) => void
}

export function PermissionTagList({ tags, placeholder, onChange }: PermissionTagListProps) {
	const [input, setInput] = useState('')

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === 'Enter' && input.trim()) {
			e.preventDefault()
			if (!tags.includes(input.trim())) {
				onChange([...tags, input.trim()])
			}
			setInput('')
		}
	}

	return (
		<div className="mt-1.5 flex flex-wrap gap-1 items-center">
			{tags.map((tag) => (
				<span
					key={tag}
					className="inline-flex items-center gap-1 text-xs font-code text-ghost/80 bg-ghost-muted px-2 py-0.5"
				>
					{tag}
					<button
						type="button"
						onClick={() => onChange(tags.filter((t) => t !== tag))}
						className="text-ghost/50 hover:text-pulse transition-colors"
					>
						<X size={10} />
					</button>
				</span>
			))}
			<input
				value={input}
				onChange={(e) => setInput(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={tags.length === 0 ? placeholder : ''}
				className="bg-transparent text-xs font-code text-chrome placeholder:text-static/50 outline-none min-w-16 flex-1 py-0.5"
			/>
		</div>
	)
}
