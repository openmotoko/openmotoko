import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronRight, Cpu, XCircle } from 'lucide-react'
import { useState } from 'react'

interface AgentNode {
	id: string
	parentId: string | null
	name: string
	role: string
	model: string
	status: string
	spent: number
	output: string | null
	createdAt: number
}

interface AgentTreeProps {
	agents: AgentNode[]
	onKill?: (id: string) => void
}

function AgentLeaf({ agent, onKill }: { agent: AgentNode; onKill?: (id: string) => void }) {
	const [expanded, setExpanded] = useState(false)

	const statusColor =
		agent.status === 'completed'
			? 'text-alive'
			: agent.status === 'running'
				? 'text-ghost'
				: agent.status === 'failed'
					? 'text-pulse'
					: 'text-static'

	return (
		<div className="border-l border-(--border-default) pl-3 ml-2">
			<div className="flex items-center gap-2 py-1.5">
				<button
					type="button"
					onClick={() => setExpanded(!expanded)}
					className="text-static hover:text-chrome"
				>
					{expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
				</button>

				<Cpu className={`w-3.5 h-3.5 ${statusColor}`} />

				<span className="text-xs font-ui text-chrome">{agent.name}</span>

				<span className={`text-[10px] font-ui ${statusColor} uppercase`}>{agent.status}</span>

				<span className="text-[10px] font-ui text-static/50">{agent.model}</span>

				{agent.spent > 0 && (
					<span className="text-[10px] font-ui text-edge">${agent.spent.toFixed(4)}</span>
				)}

				{agent.status === 'running' && onKill && (
					<button
						type="button"
						onClick={() => onKill(agent.id)}
						className="ml-auto text-static hover:text-pulse transition-colors"
						title="Kill agent"
					>
						<XCircle className="w-3.5 h-3.5" />
					</button>
				)}
			</div>

			<AnimatePresence>
				{expanded && agent.output && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						className="overflow-hidden"
					>
						<pre className="text-[10px] font-ui text-static/70 bg-void/50 p-2 ml-5 mb-2 max-h-32 overflow-auto whitespace-pre-wrap border border-(--border-default)">
							{agent.output}
						</pre>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}

export function AgentTree({ agents, onKill }: AgentTreeProps) {
	if (agents.length === 0) return null

	const roots = agents.filter((a) => !a.parentId || a.parentId === 'primary')
	const children = agents.filter((a) => a.parentId && a.parentId !== 'primary')

	const childMap = new Map<string, AgentNode[]>()
	for (const child of children) {
		const existing = childMap.get(child.parentId!) ?? []
		existing.push(child)
		childMap.set(child.parentId!, existing)
	}

	return (
		<div className="space-y-1">
			<div className="flex items-center gap-2 mb-2">
				<Cpu className="w-4 h-4 text-ghost" />
				<span className="text-xs font-ui text-ghost uppercase tracking-wider">Agent Hierarchy</span>
				<span className="text-[10px] font-ui text-static">({agents.length} active)</span>
			</div>

			{roots.map((agent) => (
				<div key={agent.id}>
					<AgentLeaf agent={agent} onKill={onKill} />
					{childMap.get(agent.id)?.map((child) => (
						<div key={child.id} className="ml-4">
							<AgentLeaf agent={child} onKill={onKill} />
						</div>
					))}
				</div>
			))}
		</div>
	)
}
