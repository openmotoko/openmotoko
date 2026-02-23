import { useEffect, useState } from 'react'

const LEVELS = [
	{ level: 0, name: 'Ask Everything', description: 'Every action requires explicit approval' },
	{
		level: 1,
		name: 'Read Freely',
		description: 'Read operations are autonomous, writes need approval',
	},
	{
		level: 2,
		name: 'Routine Autonomy',
		description: 'Pre-approved patterns execute automatically',
	},
	{
		level: 3,
		name: 'Full Autonomy',
		description: 'Only critical/irreversible actions need approval',
	},
] as const

export function AutonomyPanel() {
	const [currentLevel, setCurrentLevel] = useState(0)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		fetch('/api/settings/autonomy_level')
			.then((r) => r.json())
			.then((data) => {
				setCurrentLevel(data.value ? parseInt(data.value, 10) : 0)
				setLoading(false)
			})
			.catch(() => setLoading(false))
	}, [])

	const handleChange = async (level: number) => {
		setCurrentLevel(level)
		await fetch('/api/settings', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ autonomy_level: String(level) }),
		})
	}

	if (loading) {
		return (
			<div className="p-4 bg-shell border border-(--border-default) cut-corners-sm">
				<div className="h-4 w-32 bg-panel animate-pulse rounded" />
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<h3 className="text-sm font-ui text-static uppercase tracking-wider">Autonomy Dial</h3>

			<div className="flex items-center gap-1">
				{LEVELS.map(({ level }) => (
					<button
						key={level}
						type="button"
						onClick={() => handleChange(level)}
						className={`flex-1 h-2 rounded-full transition-colors ${
							level <= currentLevel ? 'bg-ghost' : 'bg-panel'
						}`}
					/>
				))}
			</div>

			<div className="space-y-2">
				{LEVELS.map(({ level, name, description }) => (
					<button
						key={level}
						type="button"
						onClick={() => handleChange(level)}
						className={`w-full text-left p-3 border transition-colors cut-corners ${
							level === currentLevel
								? 'border-(--ghost-border) bg-ghost-muted'
								: 'border-(--border-default) bg-shell hover:border-(--border-hover)'
						}`}
						style={{ '--cut-md': '8px' } as React.CSSProperties}
					>
						<div className="flex items-center gap-2">
							<span
								className={`text-xs font-code ${level === currentLevel ? 'text-ghost' : 'text-static'}`}
							>
								L{level}
							</span>
							<span
								className={`text-sm font-ui ${level === currentLevel ? 'text-chrome' : 'text-static'}`}
							>
								{name}
							</span>
						</div>
						<p className="text-xs font-body text-static mt-1">{description}</p>
					</button>
				))}
			</div>
		</div>
	)
}
