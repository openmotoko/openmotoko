import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { CreateTaskDialog } from '../components/scheduler/create-task-dialog'
import { TaskRow } from '../components/scheduler/task-row'
import type { ScheduledTaskItem } from '../lib/api'
import { api } from '../lib/api'

export function SchedulerPage() {
	const { data: tasks, isLoading } = useQuery({
		queryKey: ['scheduler-tasks'],
		queryFn: () => api.getSchedulerTasks(),
		refetchInterval: 30_000,
	})

	return (
		<div className="h-full overflow-y-auto">
			<div className="max-w-4xl mx-auto px-6 py-6">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-3">
						<Clock size={20} className="text-ghost" />
						<h1 className="font-display font-bold text-xl text-chrome">Scheduler</h1>
					</div>
					<CreateTaskDialog />
				</div>

				<TaskSummary tasks={tasks} />

				{isLoading && (
					<p className="text-sm font-ui text-static text-center py-12">Loading tasks...</p>
				)}

				{!isLoading && tasks && tasks.length === 0 && (
					<div className="text-center py-16">
						<Clock size={40} className="text-static/30 mx-auto mb-3" />
						<p className="text-sm font-ui text-static">No scheduled tasks yet</p>
						<p className="text-xs font-body text-static/60 mt-1">
							Create a task to get started with automated scheduling
						</p>
					</div>
				)}

				{tasks && tasks.length > 0 && (
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
						{tasks.map((task) => (
							<TaskRow key={task.id} task={task} />
						))}
					</motion.div>
				)}
			</div>
		</div>
	)
}

function TaskSummary({ tasks }: { tasks: ScheduledTaskItem[] | undefined }) {
	if (!tasks || tasks.length === 0) return null

	const active = tasks.filter((t) => t.enabled).length
	const running = tasks.filter((t) => t.status === 'running').length
	const failed = tasks.filter((t) => t.status === 'failed').length

	return (
		<div className="grid grid-cols-3 gap-3 mb-6">
			<SummaryCard label="Active" value={active} color="ghost" />
			<SummaryCard label="Running" value={running} color="alive" />
			<SummaryCard label="Failed" value={failed} color="edge" />
		</div>
	)
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
	return (
		<div
			className={`bg-shell border border-[var(--${color === 'ghost' ? 'ghost-border' : 'border-default'})] p-4 cut-tr cut-border`}
			style={{ '--cut-md': '8px' } as React.CSSProperties}
		>
			<span className="text-xs font-ui font-bold uppercase tracking-wider text-static block mb-1">
				{label}
			</span>
			<span className={`font-display font-bold text-2xl text-${color}`}>{value}</span>
		</div>
	)
}
