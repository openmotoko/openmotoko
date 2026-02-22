import { AnimatePresence, motion } from 'framer-motion'
import {
	Activity,
	CheckCircle,
	ChevronDown,
	ChevronUp,
	DollarSign,
	MessageSquare,
	Puzzle,
	Send,
	Terminal,
} from 'lucide-react'
import { useState } from 'react'
import type { ActivityItem as ActivityItemType } from '../../lib/api'
import { StatusBadge } from './status-badge'

interface ActivityItemProps {
	item: ActivityItemType
}

const eventIcons: Record<string, typeof Activity> = {
	'message:received': MessageSquare,
	'message:sent': MessageSquare,
	'tool:called': Terminal,
	'tool:result': Terminal,
	'llm:stream': Activity,
	'llm:complete': CheckCircle,
	'cost:updated': DollarSign,
	'skill:activated': Puzzle,
	'channel:message': Send,
}

const eventColors: Record<string, string> = {
	'message:received': 'text-ghost',
	'message:sent': 'text-ghost',
	'tool:called': 'text-edge',
	'tool:result': 'text-edge',
	'llm:stream': 'text-ghost',
	'llm:complete': 'text-alive',
	'cost:updated': 'text-edge',
	'skill:activated': 'text-alive',
	'channel:message': 'text-ghost',
}

function getEventDescription(item: ActivityItemType): string {
	const data = item.data as Record<string, unknown>
	switch (item.type) {
		case 'message:received':
			return 'Received user message'
		case 'message:sent':
			return 'Agent response sent'
		case 'tool:called':
			return `Tool called: ${data?.tool ?? 'unknown'}`
		case 'tool:result':
			return `Tool completed: ${data?.tool ?? 'unknown'}`
		case 'llm:complete':
			return 'LLM generation complete'
		case 'cost:updated':
			return `Cost updated: $${(data?.totalToday as number)?.toFixed(4) ?? '0'}`
		case 'skill:activated':
			return `Skill activated: ${data?.skillId ?? 'unknown'}`
		case 'channel:message':
			return `${data?.channel ?? 'Channel'}: ${data?.from ?? 'unknown'}`
		default:
			return item.type
	}
}

function getEventStatus(item: ActivityItemType): 'running' | 'success' | 'error' | 'pending' {
	const data = item.data as Record<string, unknown>
	if (item.type.includes('error') || data?.status === 'error') return 'error'
	if (item.type === 'tool:called') return 'running'
	if (item.type.includes('complete') || item.type.includes('result') || item.type.includes('sent'))
		return 'success'
	return 'pending'
}

export function ActivityItem({ item }: ActivityItemProps) {
	const [expanded, setExpanded] = useState(false)
	const Icon = eventIcons[item.type] ?? Activity
	const color = eventColors[item.type] ?? 'text-static'
	const description = getEventDescription(item)
	const status = getEventStatus(item)

	return (
		<div className="border-b border-[var(--border-default)] last:border-b-0">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[rgba(74,96,112,0.05)] transition-colors text-left"
			>
				<span className="text-xs font-code text-static flex-shrink-0 w-16">
					{new Date(item.createdAt).toLocaleTimeString('en', {
						hour: '2-digit',
						minute: '2-digit',
						second: '2-digit',
					})}
				</span>

				<Icon size={14} className={`${color} flex-shrink-0`} />

				<span className="text-xs font-ui text-chrome truncate flex-1">{description}</span>

				<StatusBadge status={status} />

				{expanded ? (
					<ChevronUp size={12} className="text-static flex-shrink-0" />
				) : (
					<ChevronDown size={12} className="text-static flex-shrink-0" />
				)}
			</button>

			<AnimatePresence>
				{expanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
						className="overflow-hidden"
					>
						<pre className="px-4 pb-3 text-xs font-code text-static bg-void/30 mx-4 mb-3 p-3 overflow-x-auto max-h-64 border border-[var(--border-default)]">
							{JSON.stringify(item.data, null, 2)}
						</pre>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}
