type BadgeStatus = 'running' | 'success' | 'error' | 'pending'

interface StatusBadgeProps {
	status: BadgeStatus
}

const statusConfig: Record<BadgeStatus, { bg: string; text: string; label: string }> = {
	running: {
		bg: 'bg-edge-muted',
		text: 'text-edge',
		label: 'RUNNING',
	},
	success: {
		bg: 'bg-alive-muted',
		text: 'text-alive',
		label: 'SUCCESS',
	},
	error: {
		bg: 'bg-pulse-muted',
		text: 'text-pulse',
		label: 'ERROR',
	},
	pending: {
		bg: 'bg-ghost-muted',
		text: 'text-ghost',
		label: 'PENDING',
	},
}

export function StatusBadge({ status }: StatusBadgeProps) {
	const config = statusConfig[status]

	return (
		<span
			className={`
				inline-flex items-center font-ui text-xs font-bold uppercase tracking-wider
				px-3 py-px cut-chevron ${config.bg} ${config.text}
			`}
		>
			{config.label}
		</span>
	)
}
