import { Activity, DollarSign, MessageSquare, Wifi } from 'lucide-react'
import { ActivityFeed } from '../components/activity/activity-feed'
import { useActivity } from '../hooks/use-activity'
import { useStore } from '../lib/store'

function StatCard({
	icon: Icon,
	label,
	value,
	color,
}: {
	icon: typeof Activity
	label: string
	value: string
	color: string
}) {
	return (
		<div
			className="bg-shell border border-[var(--border-default)] p-4 cut-tr cut-border relative"
			style={{ '--cut-md': '10px' } as React.CSSProperties}
		>
			<div className="flex items-center gap-2 mb-2">
				<Icon size={14} className={color} />
				<span className="text-xs font-ui font-bold uppercase tracking-wider text-static">
					{label}
				</span>
			</div>
			<span className={`font-display font-bold text-xl ${color}`}>{value}</span>
		</div>
	)
}

export function ActivityPage() {
	const { activityFilters, setActivityFilters, costToday, wsConnected } = useStore()
	const { data: activity, isLoading } = useActivity({
		channel: activityFilters.channel ?? undefined,
		skillId: activityFilters.skillId ?? undefined,
		type: activityFilters.type ?? undefined,
		limit: 50,
	})

	const liveItems = useStore((s) => s.activityFeed)
	const allItems = [...liveItems, ...(activity ?? [])].sort((a, b) => b.createdAt - a.createdAt)

	const uniqueItems = allItems.filter(
		(item, index, self) => self.findIndex((i) => i.id === item.id) === index,
	)

	const filterTypes = [
		{ value: null, label: 'All' },
		{ value: 'message', label: 'Messages' },
		{ value: 'tool', label: 'Tools' },
		{ value: 'llm', label: 'LLM' },
		{ value: 'cost', label: 'Cost' },
		{ value: 'channel', label: 'Channels' },
	]

	return (
		<div className="h-full overflow-y-auto">
			<div className="max-w-5xl mx-auto px-6 py-6">
				<div className="flex items-center gap-3 mb-6">
					<Activity size={20} className="text-ghost" />
					<h1 className="font-display font-bold text-xl text-chrome">Activity</h1>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
					<StatCard
						icon={DollarSign}
						label="Cost Today"
						value={`$${costToday.toFixed(4)}`}
						color="text-edge"
					/>
					<StatCard
						icon={MessageSquare}
						label="Conversations"
						value={String(uniqueItems.filter((i) => i.type.startsWith('message')).length)}
						color="text-ghost"
					/>
					<StatCard
						icon={Wifi}
						label="System"
						value={wsConnected ? 'ONLINE' : 'OFFLINE'}
						color={wsConnected ? 'text-alive' : 'text-pulse'}
					/>
				</div>

				<div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
					{filterTypes.map((ft) => {
						const isActive =
							ft.value === null ? activityFilters.type === null : activityFilters.type === ft.value

						return (
							<button
								key={ft.label}
								type="button"
								onClick={() => setActivityFilters({ type: ft.value })}
								className={`
									px-3 py-1.5 text-xs font-ui font-medium transition-all flex-shrink-0 cut-tr
									${
										isActive
											? 'bg-ghost-muted text-ghost border border-[var(--ghost-border)]'
											: 'text-static border border-[var(--border-default)] hover:text-chrome hover:border-[var(--border-hover)]'
									}
								`}
								style={{ '--cut-md': '6px' } as React.CSSProperties}
							>
								{ft.label}
							</button>
						)
					})}
				</div>

				<ActivityFeed
					items={
						activityFilters.type
							? uniqueItems.filter((i) => i.type.startsWith(activityFilters.type!))
							: uniqueItems
					}
					isLoading={isLoading}
				/>
			</div>
		</div>
	)
}
