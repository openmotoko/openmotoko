import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
	icon: LucideIcon
	title: string
	description: string
	action?: {
		label: string
		onClick: () => void
	}
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center h-full min-h-[300px] p-8">
			<div className="flex flex-col items-center gap-4 max-w-sm text-center">
				<div className="w-14 h-14 flex items-center justify-center bg-shell border border-(--border-default) cut-hex">
					<Icon size={24} className="text-static/40" />
				</div>
				<h3 className="text-base font-display font-semibold text-chrome">{title}</h3>
				<p className="text-sm font-body text-static/70 leading-relaxed">{description}</p>
				{action && (
					<button
						type="button"
						onClick={action.onClick}
						className="px-4 py-2 bg-ghost text-void font-ui text-sm font-semibold cut-tr-sm hover:bg-ghost-hover transition-colors mt-2"
					>
						{action.label}
					</button>
				)}
			</div>
		</div>
	)
}
