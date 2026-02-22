import { useQuery } from '@tanstack/react-query'
import type { Skill } from '../../lib/api'
import { api } from '../../lib/api'

interface SkillTogglesProps {
	enabledSkills: Set<string>
	onToggle: (skillId: string) => void
}

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={enabled}
			onClick={onToggle}
			className={`relative w-8 h-[18px] rounded-full transition-colors shrink-0 ${
				enabled ? 'bg-alive' : 'bg-[rgba(74,96,112,0.3)]'
			}`}
		>
			<span
				className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-chrome transition-transform ${
					enabled ? 'left-[16px]' : 'left-[2px]'
				}`}
			/>
		</button>
	)
}

function SkillRow({
	skill,
	enabled,
	onToggle,
}: {
	skill: Skill
	enabled: boolean
	onToggle: () => void
}) {
	const toolNames = skill.manifest.tools.slice(0, 3).map((t) => t.name)
	const extra = skill.manifest.tools.length - 3

	return (
		<div className="flex items-start gap-3 py-2">
			<div className="flex-1 min-w-0">
				<div className="text-xs font-ui text-chrome truncate">{skill.name}</div>
				<div className="text-[10px] font-code text-static truncate mt-0.5">
					{toolNames.join(', ')}
					{extra > 0 && ` +${extra}`}
				</div>
			</div>
			<ToggleSwitch enabled={enabled} onToggle={onToggle} />
		</div>
	)
}

export function SkillToggles({ enabledSkills, onToggle }: SkillTogglesProps) {
	const { data: skills } = useQuery({
		queryKey: ['skills'],
		queryFn: () => api.getSkills(),
	})

	if (!skills || skills.length === 0) {
		return <p className="text-xs font-body text-static py-2">No skills installed</p>
	}

	return (
		<div className="divide-y divide-(--border-default)">
			{skills.map((skill) => (
				<SkillRow
					key={skill.id}
					skill={skill}
					enabled={enabledSkills.has(skill.id)}
					onToggle={() => onToggle(skill.id)}
				/>
			))}
		</div>
	)
}
