import { CheckCircle, Puzzle, Shield, XCircle } from 'lucide-react'
import type { Skill } from '../../lib/api'

interface SkillCardProps {
	skill: Skill
	onToggle: () => void
	onClick: () => void
}

export function SkillCard({ skill, onToggle, onClick }: SkillCardProps) {
	return (
		<button
			type="button"
			className="bg-shell border border-[var(--border-default)] p-5 cut-tr cut-border relative transition-all hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.08)] cursor-pointer w-full text-left"
			style={{ '--cut-md': '12px' } as React.CSSProperties}
			onClick={onClick}
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
				<div className="flex items-center gap-2">
					<Shield size={12} className="text-edge/60" />
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation()
							onToggle()
						}}
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
		</button>
	)
}
