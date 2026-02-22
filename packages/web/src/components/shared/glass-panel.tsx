import type { ReactNode } from 'react'

interface GlassPanelProps {
	children: ReactNode
	className?: string
	variant?: 'default' | 'ghost' | 'edge' | 'pulse'
}

export function GlassPanel({ children, className = '', variant = 'default' }: GlassPanelProps) {
	const borderColor = {
		default: 'border-[var(--glass-border)]',
		ghost: 'border-[var(--ghost-border)]',
		edge: 'border-[var(--edge-border)]',
		pulse: 'border-[var(--pulse-border)]',
	}[variant]

	return (
		<div
			className={`
				bg-[var(--glass)] backdrop-blur-[16px] border
				${borderColor}
				cut-corners cut-border
				${className}
			`}
		>
			{children}
		</div>
	)
}
