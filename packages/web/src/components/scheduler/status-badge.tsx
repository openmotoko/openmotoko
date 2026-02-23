const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
	pending: { bg: 'bg-[rgba(74,96,112,0.15)]', text: 'text-static', dot: 'bg-static' },
	running: { bg: 'bg-ghost-muted', text: 'text-ghost', dot: 'bg-alive animate-ghost-pulse' },
	completed: { bg: 'bg-[rgba(0,255,128,0.1)]', text: 'text-alive', dot: 'bg-alive' },
	failed: { bg: 'bg-[rgba(255,64,88,0.1)]', text: 'text-edge', dot: 'bg-edge' },
	cancelled: { bg: 'bg-[rgba(74,96,112,0.1)]', text: 'text-static', dot: 'bg-static/50' },
}

export function StatusBadge({ status }: { status: string }) {
	const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending

	return (
		<span
			className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-code uppercase tracking-wider ${style.bg} ${style.text}`}
		>
			<span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
			{status}
		</span>
	)
}
