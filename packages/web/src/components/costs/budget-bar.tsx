import { motion } from 'framer-motion'

interface BudgetBarProps {
	spent: number
	limit: number
	label: string
	thresholds?: number[]
}

function getBarColor(percent: number): string {
	if (percent >= 95) return 'var(--color-pulse)'
	if (percent >= 80) return 'var(--color-edge)'
	return 'var(--color-ghost)'
}

function getGlowColor(percent: number): string {
	if (percent >= 95) return 'rgba(255, 45, 120, 0.4)'
	if (percent >= 80) return 'rgba(255, 107, 53, 0.3)'
	return 'rgba(0, 240, 255, 0.2)'
}

export function BudgetBar({ spent, limit, label, thresholds = [50, 80, 95] }: BudgetBarProps) {
	const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
	const barColor = getBarColor(percent)
	const glowColor = getGlowColor(percent)

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<span className="text-xs font-ui font-bold uppercase tracking-wider text-static">
					{label}
				</span>
				<span className="text-xs font-code text-chrome">
					${spent.toFixed(4)} / ${limit.toFixed(2)}
				</span>
			</div>
			<div className="relative h-3 bg-void border border-[var(--border-default)] overflow-hidden">
				{thresholds.map((t) => (
					<div
						key={t}
						className="absolute top-0 bottom-0 w-px bg-static/30 z-10"
						style={{ left: `${t}%` }}
					/>
				))}
				<motion.div
					className="absolute top-0 left-0 bottom-0"
					initial={{ width: 0 }}
					animate={{ width: `${percent}%` }}
					transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
					style={{
						background: barColor,
						boxShadow: `0 0 10px ${glowColor}`,
					}}
				/>
			</div>
			<div className="flex justify-between text-[10px] font-code text-static">
				<span>{percent.toFixed(1)}% used</span>
				<span>${(limit - spent).toFixed(4)} remaining</span>
			</div>
		</div>
	)
}
