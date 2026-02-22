import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, ChevronDown, ChevronUp, Clock, Terminal, XCircle } from 'lucide-react'
import { useState } from 'react'
import type { ToolCall, ToolResult } from '../../lib/api'

interface ThoughtProcessProps {
	toolCalls: ToolCall[]
	toolResults: ToolResult[] | null
}

function StatusIcon({ status }: { status: string }) {
	switch (status) {
		case 'success':
			return <CheckCircle size={12} className="text-alive" />
		case 'error':
			return <XCircle size={12} className="text-pulse" />
		default:
			return <Clock size={12} className="text-edge animate-pulse" />
	}
}

function CollapsibleJson({ data, label }: { data: unknown; label: string }) {
	const [open, setOpen] = useState(false)
	const json = JSON.stringify(data, null, 2)
	const isLong = json.length > 100

	if (!data) return null

	return (
		<div className="mt-1">
			{isLong ? (
				<>
					<button
						type="button"
						onClick={() => setOpen(!open)}
						className="flex items-center gap-1 text-xs font-ui text-static hover:text-chrome transition-colors"
					>
						{open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
						{label}
					</button>
					<AnimatePresence>
						{open && (
							<motion.pre
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: 'auto', opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
								className="overflow-hidden text-xs font-code text-static bg-void/50 p-2 mt-1 overflow-x-auto max-h-48 border border-[var(--border-default)]"
							>
								{json}
							</motion.pre>
						)}
					</AnimatePresence>
				</>
			) : (
				<pre className="text-xs font-code text-static bg-void/50 p-2 mt-1 overflow-x-auto border border-[var(--border-default)]">
					{json}
				</pre>
			)}
		</div>
	)
}

export function ThoughtProcess({ toolCalls, toolResults }: ThoughtProcessProps) {
	const [expanded, setExpanded] = useState(false)

	if (!toolCalls.length) return null

	const resultMap = new Map(toolResults?.map((r) => [r.callId, r]) ?? [])

	return (
		<div className="mt-2">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="flex items-center gap-2 text-xs font-ui text-static hover:text-ghost transition-colors"
			>
				<Terminal size={12} />
				<span>
					{toolCalls.length} tool call{toolCalls.length > 1 ? 's' : ''}
				</span>
				{expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
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
						<div className="mt-2 space-y-2 border-l-2 border-[var(--ghost-border)] pl-3">
							{toolCalls.map((call) => {
								const result = resultMap.get(call.id)

								return (
									<div key={call.id} className="py-1.5">
										<div className="flex items-center gap-2">
											<StatusIcon status={result?.status ?? 'pending'} />
											<span className="text-xs font-ui font-bold text-chrome">{call.name}</span>
											{result?.duration != null && (
												<span className="text-xs font-code text-static ml-auto">
													{result.duration}ms
												</span>
											)}
										</div>
										<CollapsibleJson data={call.input} label="Input" />
										{result && <CollapsibleJson data={result.output} label="Output" />}
									</div>
								)
							})}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}
