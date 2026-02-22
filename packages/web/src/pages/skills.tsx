import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle, Puzzle, XCircle } from 'lucide-react'
import type { Skill } from '../lib/api'
import { api } from '../lib/api'

function SkillCard({ skill, onToggle }: { skill: Skill; onToggle: () => void }) {
	return (
		<div
			className="bg-shell border border-[var(--border-default)] p-5 cut-tr cut-border relative transition-all hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.08)]"
			style={{ '--cut-md': '12px' } as React.CSSProperties}
		>
			<div className="flex items-start justify-between gap-3 mb-3">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 bg-ghost-muted flex items-center justify-center cut-hex flex-shrink-0">
						<Puzzle size={18} className="text-ghost" />
					</div>
					<div>
						<h3 className="font-display font-semibold text-sm text-chrome">{skill.name}</h3>
						<span className="text-xs font-code text-static">v{skill.version}</span>
					</div>
				</div>

				<button
					type="button"
					onClick={onToggle}
					className={`
						flex items-center gap-1.5 px-3 py-1 text-xs font-ui font-bold uppercase tracking-wider transition-all cut-tr
						${
							skill.enabled
								? 'bg-alive-muted text-alive border border-[var(--alive-border)]'
								: 'bg-[rgba(74,96,112,0.1)] text-static border border-[var(--border-default)] hover:text-chrome'
						}
					`}
					style={{ '--cut-md': '6px' } as React.CSSProperties}
				>
					{skill.enabled ? (
						<>
							<CheckCircle size={10} />
							Active
						</>
					) : (
						<>
							<XCircle size={10} />
							Off
						</>
					)}
				</button>
			</div>

			<p className="text-xs font-body text-static leading-relaxed mb-3">{skill.description}</p>

			{skill.manifest.capabilities.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{skill.manifest.capabilities.map((cap) => (
						<span
							key={cap}
							className="text-xs font-code text-ghost/70 bg-ghost-muted px-2 py-0.5 cut-chevron"
						>
							{cap}
						</span>
					))}
				</div>
			)}

			{skill.manifest.tools.length > 0 && (
				<div className="mt-3 border-t border-[var(--border-default)] pt-3">
					<span className="text-xs font-ui font-bold text-static uppercase tracking-wider block mb-2">
						Tools
					</span>
					<div className="space-y-1">
						{skill.manifest.tools.map((tool) => (
							<div key={tool.name} className="flex items-center gap-2">
								<div className="w-1 h-1 bg-ghost cut-diamond flex-shrink-0" />
								<span className="text-xs font-code text-chrome">{tool.name}</span>
								<span className="text-xs font-body text-static truncate">{tool.description}</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}

export function SkillsPage() {
	const queryClient = useQueryClient()
	const { data: skills, isLoading } = useQuery({
		queryKey: ['skills'],
		queryFn: () => api.getSkills(),
	})

	const toggleSkill = useMutation({
		mutationFn: (id: string) => api.toggleSkill(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['skills'] })
		},
	})

	return (
		<div className="h-full overflow-y-auto">
			<div className="max-w-5xl mx-auto px-6 py-6">
				<div className="flex items-center gap-3 mb-6">
					<Puzzle size={20} className="text-ghost" />
					<h1 className="font-display font-bold text-xl text-chrome">Skills</h1>
					{skills && (
						<span className="text-xs font-ui text-static ml-auto">
							{skills.filter((s) => s.enabled).length}/{skills.length} active
						</span>
					)}
				</div>

				{isLoading && (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{['s0', 's1', 's2', 's3', 's4', 's5'].map((id) => (
							<div
								key={id}
								className="h-48 bg-[rgba(74,96,112,0.04)] animate-pulse cut-tr"
								style={{ '--cut-md': '12px' } as React.CSSProperties}
							/>
						))}
					</div>
				)}

				{skills && (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{skills.map((skill, index) => (
							<motion.div
								key={skill.id}
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.2, delay: index * 0.05 }}
							>
								<SkillCard skill={skill} onToggle={() => toggleSkill.mutate(skill.id)} />
							</motion.div>
						))}
					</div>
				)}

				{!isLoading && skills?.length === 0 && (
					<div className="flex flex-col items-center justify-center py-16">
						<div className="w-16 h-16 bg-ghost-muted flex items-center justify-center cut-hex mb-4">
							<Puzzle size={28} className="text-ghost" />
						</div>
						<p className="font-ui text-sm text-static">No skills installed</p>
					</div>
				)}
			</div>
		</div>
	)
}
