import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Play, Power, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { ScheduledTaskItem } from '../../lib/api'
import { api } from '../../lib/api'
import { RunHistory } from './run-history'
import { StatusBadge } from './status-badge'

function formatNextRun(ts: number | null): string {
	if (!ts) return 'N/A'
	const diff = ts - Date.now()
	if (diff < 0) return 'overdue'
	if (diff < 60_000) return 'in <1m'
	if (diff < 3_600_000) return `in ${Math.round(diff / 60_000)}m`
	if (diff < 86_400_000) return `in ${Math.round(diff / 3_600_000)}h`
	return `in ${Math.round(diff / 86_400_000)}d`
}

export function TaskRow({ task }: { task: ScheduledTaskItem }) {
	const queryClient = useQueryClient()
	const [expanded, setExpanded] = useState(false)

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ['scheduler-tasks'] })

	const toggleMutation = useMutation({
		mutationFn: () => api.toggleSchedulerTask(task.id),
		onSuccess: invalidate,
	})

	const runMutation = useMutation({
		mutationFn: () => api.runSchedulerTask(task.id),
		onSuccess: () => {
			invalidate()
			queryClient.invalidateQueries({ queryKey: ['task-runs', task.id] })
		},
	})

	const deleteMutation = useMutation({
		mutationFn: () => api.deleteSchedulerTask(task.id),
		onSuccess: invalidate,
	})

	return (
		<div className="bg-shell border border-[var(--border-default)] cut-tr cut-border overflow-hidden">
			<div className="flex items-center gap-3 px-4 py-3">
				<button
					type="button"
					onClick={() => setExpanded(!expanded)}
					className="text-static hover:text-chrome transition-colors flex-shrink-0"
				>
					{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
				</button>

				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<span className="font-ui text-sm font-medium text-chrome truncate">{task.name}</span>
						<StatusBadge status={task.status} />
					</div>
					<div className="flex items-center gap-3 mt-0.5">
						<span className="text-xs font-code text-static">{task.cron}</span>
						<span className="text-xs font-code text-static">{formatNextRun(task.nextRunAt)}</span>
						{task.description && (
							<span className="text-xs font-body text-static truncate">{task.description}</span>
						)}
					</div>
				</div>

				<div className="flex items-center gap-1 flex-shrink-0">
					<button
						type="button"
						onClick={() => runMutation.mutate()}
						disabled={runMutation.isPending || task.status === 'running'}
						className="p-1.5 text-static hover:text-ghost transition-colors disabled:opacity-30"
						title="Run now"
					>
						<Play size={14} />
					</button>
					<button
						type="button"
						onClick={() => toggleMutation.mutate()}
						disabled={toggleMutation.isPending}
						className={`p-1.5 transition-colors disabled:opacity-30 ${
							task.enabled ? 'text-alive hover:text-ghost' : 'text-static hover:text-chrome'
						}`}
						title={task.enabled ? 'Disable' : 'Enable'}
					>
						<Power size={14} />
					</button>
					<button
						type="button"
						onClick={() => deleteMutation.mutate()}
						disabled={deleteMutation.isPending}
						className="p-1.5 text-static hover:text-edge transition-colors disabled:opacity-30"
						title="Delete"
					>
						<Trash2 size={14} />
					</button>
				</div>
			</div>

			<AnimatePresence>{expanded && <RunHistory taskId={task.id} />}</AnimatePresence>
		</div>
	)
}
