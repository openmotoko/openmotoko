import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'

interface PlannedAction {
	skill: string
	tool: string
	parameters: Record<string, unknown>
	riskLevel: 'low' | 'medium' | 'high' | 'critical'
	reversible: boolean
}

interface IntentCardProps {
	id: string
	summary: string
	reasoning: string
	confidence: number
	impact: 'read-only' | 'reversible' | 'irreversible'
	actions: PlannedAction[]
	suggestedResponse?: string
	alternatives?: string[]
	status: 'pending' | 'approved' | 'rejected' | 'executed' | 'expired' | 'edited'
	onApprove?: (id: string) => void
	onReject?: (id: string) => void
	onEdit?: (id: string, response: string) => void
}

const IMPACT_STYLES = {
	'read-only': 'text-ghost border-(--ghost-border)',
	reversible: 'text-edge border-[var(--edge-border)]',
	irreversible: 'text-pulse border-(--pulse-border)',
} as const

const RISK_STYLES = {
	low: 'bg-ghost/10 text-ghost',
	medium: 'bg-edge/10 text-edge',
	high: 'bg-edge/20 text-edge',
	critical: 'bg-pulse/10 text-pulse',
} as const

const STATUS_STYLES = {
	pending: 'bg-edge/20 text-edge',
	approved: 'bg-ghost/20 text-ghost',
	rejected: 'bg-pulse/20 text-pulse',
	executed: 'bg-alive/20 text-alive',
	expired: 'bg-static/20 text-static',
	edited: 'bg-pulse-muted text-pulse',
} as const

export function IntentCard({
	id,
	summary,
	reasoning,
	confidence,
	impact,
	actions,
	suggestedResponse,
	alternatives,
	status,
	onApprove,
	onReject,
	onEdit,
}: IntentCardProps) {
	const [editMode, setEditMode] = useState(false)
	const [editedResponse, setEditedResponse] = useState(suggestedResponse ?? '')
	const [expanded, setExpanded] = useState(false)

	const isPending = status === 'pending'

	return (
		<div
			className={`border bg-shell backdrop-blur-sm p-4 space-y-3 cut-corners cut-border ${IMPACT_STYLES[impact]}`}
			style={{ '--cut-md': '10px' } as React.CSSProperties}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="text-xs font-ui uppercase tracking-wider text-static">
						Proposed Action
					</span>
					<span className={`text-xs px-2 py-0.5 rounded-full font-ui ${STATUS_STYLES[status]}`}>
						{status}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<span className={`text-xs font-ui ${IMPACT_STYLES[impact]}`}>{impact}</span>
					<span className="text-xs font-code text-static">{Math.round(confidence * 100)}%</span>
				</div>
			</div>

			<p className="text-sm font-body font-medium text-chrome">{summary}</p>

			<p className="text-xs font-body text-static">{reasoning}</p>

			{actions.length > 0 && (
				<button
					type="button"
					className="text-xs text-static hover:text-chrome font-ui transition-colors"
					onClick={() => setExpanded(!expanded)}
				>
					{expanded ? 'Hide' : 'Show'} {actions.length} action{actions.length !== 1 ? 's' : ''}
				</button>
			)}

			<AnimatePresence>
				{expanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
						className="overflow-hidden space-y-1"
					>
						{actions.map((action, i) => (
							<div
								key={`${action.skill}-${action.tool}-${i}`}
								className={`flex items-center gap-2 text-xs p-2 ${RISK_STYLES[action.riskLevel]}`}
							>
								<span className="font-code">
									{action.skill}.{action.tool}
								</span>
								{!action.reversible && (
									<span className="text-[10px] px-1 py-0.5 bg-pulse/20 text-pulse">
										irreversible
									</span>
								)}
							</div>
						))}
					</motion.div>
				)}
			</AnimatePresence>

			{suggestedResponse && !editMode && (
				<div className="bg-panel border border-(--border-default) p-3 text-sm text-chrome font-code whitespace-pre-wrap">
					{suggestedResponse}
				</div>
			)}

			{editMode && (
				<textarea
					value={editedResponse}
					onChange={(e) => setEditedResponse(e.target.value)}
					className="w-full bg-panel border border-(--border-default) p-3 text-sm text-chrome font-code resize-none focus:outline-none focus:border-(--ghost-border)"
					rows={4}
				/>
			)}

			{alternatives && alternatives.length > 0 && (
				<div className="text-xs text-static font-body">
					<span className="font-ui">Alternatives: </span>
					{alternatives.join(' | ')}
				</div>
			)}

			{isPending && (
				<div className="flex items-center gap-2 pt-1">
					<button
						type="button"
						onClick={() => {
							if (editMode) {
								onEdit?.(id, editedResponse)
								setEditMode(false)
							} else {
								onApprove?.(id)
							}
						}}
						className="px-3 py-1.5 bg-ghost/20 hover:bg-ghost/30 text-ghost border border-(--ghost-border) text-xs font-ui transition-colors cut-tr"
						style={{ '--cut-md': '6px' } as React.CSSProperties}
					>
						{editMode ? 'Save & Approve' : 'Approve'}
					</button>
					{suggestedResponse && !editMode && (
						<button
							type="button"
							onClick={() => setEditMode(true)}
							className="px-3 py-1.5 bg-pulse/20 hover:bg-pulse/30 text-pulse border border-(--pulse-border) text-xs font-ui transition-colors cut-tr"
							style={{ '--cut-md': '6px' } as React.CSSProperties}
						>
							Edit
						</button>
					)}
					<button
						type="button"
						onClick={() => onReject?.(id)}
						className="px-3 py-1.5 bg-pulse/20 hover:bg-pulse/30 text-pulse border border-(--pulse-border) text-xs font-ui transition-colors cut-tr"
						style={{ '--cut-md': '6px' } as React.CSSProperties}
					>
						Skip
					</button>
				</div>
			)}
		</div>
	)
}
