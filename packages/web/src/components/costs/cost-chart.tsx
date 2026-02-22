import { motion } from 'framer-motion'
import { useState } from 'react'
import type { CostHistoryEntry } from '../../lib/api'

interface CostChartProps {
	data: CostHistoryEntry[]
}

export function CostChart({ data }: CostChartProps) {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
	const maxCost = Math.max(...data.map((d) => d.cost), 0.001)

	if (data.length === 0) {
		return (
			<div className="flex items-center justify-center h-48 text-static text-xs font-ui">
				No cost data yet
			</div>
		)
	}

	return (
		<div className="relative">
			{hoveredIndex !== null && data[hoveredIndex] && (
				<div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-shell border border-[var(--ghost-border)] text-xs font-code text-ghost z-10 whitespace-nowrap">
					{data[hoveredIndex].date}: ${data[hoveredIndex].cost.toFixed(4)} /{' '}
					{data[hoveredIndex].tokens.toLocaleString()} tokens
				</div>
			)}
			<div className="flex items-end gap-[2px] h-48">
				{data.map((entry, i) => {
					const heightPercent = (entry.cost / maxCost) * 100
					const isHovered = hoveredIndex === i

					return (
						<motion.div
							key={entry.date}
							className="flex-1 min-w-[4px] relative cursor-pointer"
							style={{ height: '100%' }}
							onMouseEnter={() => setHoveredIndex(i)}
							onMouseLeave={() => setHoveredIndex(null)}
						>
							<motion.div
								className="absolute bottom-0 w-full transition-colors"
								initial={{ height: 0 }}
								animate={{ height: `${Math.max(heightPercent, 1)}%` }}
								transition={{ duration: 0.4, delay: i * 0.015 }}
								style={{
									background: isHovered
										? 'var(--color-ghost)'
										: heightPercent > 80
											? 'var(--color-pulse)'
											: heightPercent > 50
												? 'var(--color-edge)'
												: 'var(--color-ghost)',
									opacity: isHovered ? 1 : 0.7,
									boxShadow: isHovered ? '0 0 8px var(--color-ghost)' : 'none',
								}}
							/>
						</motion.div>
					)
				})}
			</div>
			<div className="flex justify-between mt-2 text-[10px] font-code text-static">
				<span>{data[0]?.date}</span>
				<span>{data[data.length - 1]?.date}</span>
			</div>
		</div>
	)
}
