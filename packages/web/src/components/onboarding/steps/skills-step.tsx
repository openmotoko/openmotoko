import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle, Puzzle, XCircle } from 'lucide-react'
import { useEffect } from 'react'
import { api } from '../../../lib/api'
import type { StepProps } from '../types'

export function SkillsStep({ data, onChange }: StepProps) {
	const { data: skills, isLoading } = useQuery({
		queryKey: ['skills'],
		queryFn: () => api.getSkills(),
	})

	useEffect(() => {
		if (skills && data.enabledSkills.length === 0) {
			onChange({ enabledSkills: skills.map((s) => s.id) })
		}
	}, [skills, data.enabledSkills.length, onChange])

	const toggle = (id: string) => {
		const current = data.enabledSkills
		onChange({
			enabledSkills: current.includes(id) ? current.filter((s) => s !== id) : [...current, id],
		})
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-display font-bold text-lg text-chrome mb-1">Enable skills</h2>
				<p className="text-sm font-body text-static">
					Skills give your agent capabilities. All are enabled by default.
				</p>
			</div>

			{isLoading && (
				<div className="space-y-3">
					{[0, 1, 2].map((i) => (
						<div
							key={i}
							className="h-16 bg-static/5 animate-pulse cut-tr"
							style={{ '--cut-md': '8px' } as React.CSSProperties}
						/>
					))}
				</div>
			)}

			{skills && (
				<div className="space-y-2">
					{skills.map((skill, i) => {
						const enabled = data.enabledSkills.includes(skill.id)
						return (
							<motion.button
								key={skill.id}
								type="button"
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: i * 0.04 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => toggle(skill.id)}
								className={`w-full text-left flex items-center gap-4 p-4 border transition-all cut-tr cut-border ${
									enabled
										? 'bg-alive-muted border-[var(--alive-border)]'
										: 'bg-shell border-[var(--border-default)]'
								}`}
								style={{ '--cut-md': '8px' } as React.CSSProperties}
							>
								<div
									className={`w-8 h-8 flex items-center justify-center cut-hex flex-shrink-0 ${
										enabled ? 'bg-alive/10' : 'bg-void/50'
									}`}
								>
									<Puzzle size={14} className={enabled ? 'text-alive' : 'text-static'} />
								</div>
								<div className="flex-1 min-w-0">
									<span
										className={`font-ui font-bold text-sm block ${enabled ? 'text-chrome' : 'text-static'}`}
									>
										{skill.name}
									</span>
									<span className="text-xs font-body text-static truncate block">
										{skill.description}
									</span>
								</div>
								{enabled ? (
									<CheckCircle size={16} className="text-alive flex-shrink-0" />
								) : (
									<XCircle size={16} className="text-static/40 flex-shrink-0" />
								)}
							</motion.button>
						)
					})}
				</div>
			)}

			{!isLoading && skills?.length === 0 && (
				<div className="py-8 text-center">
					<p className="text-xs font-ui text-static">No skills available yet</p>
				</div>
			)}
		</div>
	)
}
