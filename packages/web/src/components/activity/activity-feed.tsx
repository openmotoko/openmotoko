import { motion } from 'framer-motion'
import type { ActivityItem as ActivityItemType } from '../../lib/api'
import { ActivityItem } from './activity-item'

interface ActivityFeedProps {
	items: ActivityItemType[]
	isLoading?: boolean
}

export function ActivityFeed({ items, isLoading }: ActivityFeedProps) {
	if (isLoading) {
		return (
			<div className="space-y-px">
				{['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's7'].map((id) => (
					<div key={id} className="h-12 bg-[rgba(74,96,112,0.04)] animate-pulse" />
				))}
			</div>
		)
	}

	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16">
				<p className="font-ui text-sm text-static">No activity yet</p>
			</div>
		)
	}

	return (
		<div
			className="bg-shell border border-[var(--border-default)] cut-tr"
			style={{ '--cut-md': '12px' } as React.CSSProperties}
		>
			{items.map((item, index) => (
				<motion.div
					key={item.id}
					initial={{ opacity: 0, x: -12 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.15, delay: index * 0.02 }}
				>
					<ActivityItem item={item} />
				</motion.div>
			))}
		</div>
	)
}
