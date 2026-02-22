import { Calendar, Clock, Coins, Hash, Zap } from 'lucide-react'
import type { ReactNode } from 'react'

interface ConversationStatsProps {
	tokens: number
	cost: number
	messageCount: number
	createdAt: number
	updatedAt: number
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
	return (
		<div
			className="bg-void px-3 py-2.5 cut-tr"
			style={{ '--cut-md': '5px' } as React.CSSProperties}
		>
			<div className="flex items-center gap-1.5 mb-1">
				{icon}
				<span className="text-[10px] font-ui uppercase tracking-wider text-static">{label}</span>
			</div>
			<span className="text-xs font-code text-chrome">{value}</span>
		</div>
	)
}

function formatDate(ts: number) {
	return new Date(ts).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function formatTime(ts: number) {
	const diff = Date.now() - ts
	const mins = Math.floor(diff / 60_000)
	if (mins < 1) return 'Just now'
	if (mins < 60) return `${mins}m ago`
	const hours = Math.floor(mins / 60)
	if (hours < 24) return `${hours}h ago`
	return formatDate(ts)
}

function formatCost(cost: number) {
	return cost < 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(2)}`
}

function formatTokens(tokens: number) {
	if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
	if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
	return String(tokens)
}

export function ConversationStats({
	tokens,
	cost,
	messageCount,
	createdAt,
	updatedAt,
}: ConversationStatsProps) {
	return (
		<div className="grid grid-cols-2 gap-2">
			<StatCard
				icon={<Zap size={10} className="text-ghost" />}
				label="Tokens"
				value={formatTokens(tokens)}
			/>
			<StatCard
				icon={<Coins size={10} className="text-edge" />}
				label="Cost"
				value={formatCost(cost)}
			/>
			<StatCard
				icon={<Hash size={10} className="text-pulse" />}
				label="Messages"
				value={String(messageCount)}
			/>
			<StatCard
				icon={<Calendar size={10} className="text-alive" />}
				label="Created"
				value={formatDate(createdAt)}
			/>
			<div className="col-span-2">
				<StatCard
					icon={<Clock size={10} className="text-ghost" />}
					label="Last Activity"
					value={formatTime(updatedAt)}
				/>
			</div>
		</div>
	)
}
