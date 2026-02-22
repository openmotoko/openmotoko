import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle } from 'lucide-react'
import { api } from '../../lib/api'

function formatDuration(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)}ms`
	return `${(ms / 1000).toFixed(1)}s`
}

function formatTime(ts: number): string {
	return new Date(ts).toLocaleString()
}

export function RunHistory({ taskId }: { taskId: string }) {
	const { data: runs, isLoading } = useQuery({
		queryKey: ['task-runs', taskId],
		queryFn: () => api.getTaskRuns(taskId),
	})

	if (isLoading) {
		return <p className="text-xs font-ui text-static py-3 px-4">Loading...</p>
	}

	if (!runs || runs.length === 0) {
		return <p className="text-xs font-ui text-static py-3 px-4">No runs yet</p>
	}

	return (
		<motion.div
			initial={{ height: 0, opacity: 0 }}
			animate={{ height: 'auto', opacity: 1 }}
			exit={{ height: 0, opacity: 0 }}
			className="overflow-hidden"
		>
			<div className="border-t border-[var(--border-default)] bg-void/30">
				<div className="px-4 py-2 border-b border-[var(--border-default)]">
					<span className="text-xs font-ui font-bold uppercase tracking-wider text-static">
						Run History
					</span>
				</div>
				<div className="max-h-48 overflow-y-auto">
					{runs.map((run) => (
						<div
							key={run.id}
							className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border-default)] last:border-b-0"
						>
							{run.success ? (
								<CheckCircle size={14} className="text-alive flex-shrink-0" />
							) : (
								<XCircle size={14} className="text-edge flex-shrink-0" />
							)}
							<span className="text-xs font-code text-chrome flex-1 truncate">
								{run.error ?? 'OK'}
							</span>
							<span className="text-xs font-code text-static flex-shrink-0">
								{formatDuration(run.duration)}
							</span>
							<span className="text-xs font-code text-static flex-shrink-0">
								{formatTime(run.createdAt)}
							</span>
						</div>
					))}
				</div>
			</div>
		</motion.div>
	)
}
