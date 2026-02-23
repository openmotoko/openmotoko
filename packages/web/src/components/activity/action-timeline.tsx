import { useEffect, useState } from 'react'

interface ActionEntry {
	id: string
	action: string
	result: string
	approval: string
	tokenCost: number
	createdAt: number
	intentId?: string
}

const RESULT_STYLES = {
	success: 'text-alive',
	failure: 'text-pulse',
	partial: 'text-edge',
} as const

const APPROVAL_STYLES = {
	autonomous: 'text-ghost',
	'user-approved': 'text-alive',
	'user-edited': 'text-pulse',
	'user-rejected': 'text-pulse',
} as const

export function ActionTimeline() {
	const [entries, setEntries] = useState<ActionEntry[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		fetch('/api/activity/actions')
			.then((r) => r.json())
			.then((data) => {
				setEntries(data.entries ?? [])
				setLoading(false)
			})
			.catch(() => setLoading(false))
	}, [])

	if (loading) {
		return <div className="text-xs font-body text-static p-4">Loading action timeline...</div>
	}

	if (entries.length === 0) {
		return <div className="text-xs font-body text-static p-4">No actions recorded yet.</div>
	}

	const grouped = new Map<string, ActionEntry[]>()
	for (const entry of entries) {
		const date = new Date(entry.createdAt).toLocaleDateString()
		if (!grouped.has(date)) grouped.set(date, [])
		grouped.get(date)?.push(entry)
	}

	return (
		<div className="space-y-6 p-4">
			{[...grouped.entries()].map(([date, actions]) => (
				<div key={date}>
					<h4 className="text-xs font-ui text-static uppercase tracking-wider mb-2">{date}</h4>
					<div className="space-y-1">
						{actions.map((entry) => {
							const time = new Date(entry.createdAt).toLocaleTimeString([], {
								hour: '2-digit',
								minute: '2-digit',
							})
							const resultStyle =
								RESULT_STYLES[entry.result as keyof typeof RESULT_STYLES] ?? 'text-static'
							const approvalStyle =
								APPROVAL_STYLES[entry.approval as keyof typeof APPROVAL_STYLES] ?? 'text-static'

							return (
								<div
									key={entry.id}
									className="flex items-center gap-3 text-xs py-1.5 px-2 hover:bg-shell/50 transition-colors"
								>
									<span className="text-static font-code w-12">{time}</span>
									<span className={`${approvalStyle} font-ui w-10`}>
										{entry.approval === 'autonomous'
											? 'auto'
											: entry.approval === 'user-approved'
												? 'ok'
												: entry.approval}
									</span>
									<span className={resultStyle}>
										{entry.result === 'success'
											? '\u2713'
											: entry.result === 'failure'
												? '\u2717'
												: '~'}
									</span>
									<span className="text-chrome font-body flex-1 truncate">{entry.action}</span>
									{entry.tokenCost > 0 && (
										<span className="text-static font-code">{entry.tokenCost}t</span>
									)}
								</div>
							)
						})}
					</div>
				</div>
			))}
		</div>
	)
}
