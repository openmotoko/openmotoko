import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Download, Puzzle } from 'lucide-react'
import { useState } from 'react'
import { InstallSkillDialog } from '../components/skills/install-skill-dialog'
import { SkillCard } from '../components/skills/skill-card'
import { SkillDetail } from '../components/skills/skill-detail'
import type { Skill } from '../lib/api'
import { api } from '../lib/api'

export function SkillsPage() {
	const queryClient = useQueryClient()
	const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
	const [installOpen, setInstallOpen] = useState(false)

	const { data: skills, isLoading } = useQuery({
		queryKey: ['skills'],
		queryFn: () => api.getSkills(),
	})

	const toggleSkill = useMutation({
		mutationFn: (id: string) => api.toggleSkill(id),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skills'] }),
	})

	const installSkill = useMutation({
		mutationFn: (url: string) => api.installSkill({ url }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['skills'] })
			setInstallOpen(false)
		},
	})

	return (
		<div className="h-full overflow-y-auto">
			<div className="max-w-5xl mx-auto px-6 py-6">
				<div className="flex items-center gap-3 mb-6">
					<Puzzle size={20} className="text-ghost" />
					<h1 className="font-display font-bold text-xl text-chrome">Skills</h1>
					<div className="flex items-center gap-3 ml-auto">
						{skills && (
							<span className="text-xs font-ui text-static">
								{skills.filter((s) => s.enabled).length}/{skills.length} active
							</span>
						)}
						<button
							type="button"
							onClick={() => setInstallOpen(true)}
							className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-ui font-bold uppercase tracking-wider bg-ghost-muted text-ghost border border-[var(--ghost-border)] cut-tr transition-all hover:bg-ghost/20"
							style={{ '--cut-md': '6px' } as React.CSSProperties}
						>
							<Download size={12} />
							Install
						</button>
					</div>
				</div>

				{isLoading && (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{['s0', 's1', 's2', 's3', 's4', 's5'].map((id) => (
							<div
								key={id}
								className="h-36 bg-[rgba(74,96,112,0.04)] animate-pulse cut-tr"
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
								<SkillCard
									skill={skill}
									onToggle={() => toggleSkill.mutate(skill.id)}
									onClick={() => setSelectedSkill(skill)}
								/>
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
						<button
							type="button"
							onClick={() => setInstallOpen(true)}
							className="mt-3 text-xs font-ui text-ghost hover:text-ghost-hover transition-colors"
						>
							Install your first skill
						</button>
					</div>
				)}
			</div>

			<SkillDetail
				skill={selectedSkill}
				open={!!selectedSkill}
				onClose={() => setSelectedSkill(null)}
			/>

			<InstallSkillDialog
				open={installOpen}
				onClose={() => setInstallOpen(false)}
				onInstall={(url) => installSkill.mutate(url)}
				loading={installSkill.isPending}
			/>
		</div>
	)
}
