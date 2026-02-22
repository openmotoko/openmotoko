import type { ReactNode } from 'react'
import type { SkillPermissions } from '../../lib/api'
import { PermissionTagList } from './permission-tag-list'

interface PermissionMatrixProps {
	permissions: SkillPermissions
	onChange: (permissions: SkillPermissions) => void
}

function PermToggle({
	enabled,
	onToggle,
	label,
}: {
	enabled: boolean
	onToggle: () => void
	label: string
}) {
	return (
		<button type="button" onClick={onToggle} className="flex items-center gap-2 group">
			<div
				className={`w-8 h-4 relative rounded-sm transition-all ${
					enabled ? 'bg-ghost/20 shadow-[0_0_10px_rgba(0,240,255,0.3)]' : 'bg-[rgba(74,96,112,0.2)]'
				}`}
			>
				<div
					className={`absolute top-[2px] w-3 h-3 rounded-sm transition-all ${
						enabled ? 'left-[18px] bg-ghost' : 'left-[2px] bg-static'
					}`}
				/>
			</div>
			<span
				className={`text-xs font-ui uppercase tracking-wider transition-colors ${
					enabled ? 'text-ghost' : 'text-static group-hover:text-chrome'
				}`}
			>
				{label}
			</span>
		</button>
	)
}

interface RowProps {
	label: string
	children: ReactNode
	tags: string[]
	tagPlaceholder: string
	onTagsChange: (tags: string[]) => void
}

function PermissionRow({ label, children, tags, tagPlaceholder, onTagsChange }: RowProps) {
	return (
		<div className="border-b border-[var(--border-default)] pb-3 last:border-b-0">
			<span className="text-xs font-ui font-bold text-static uppercase tracking-wider block mb-2">
				{label}
			</span>
			<div className="flex gap-3">{children}</div>
			<PermissionTagList tags={tags} placeholder={tagPlaceholder} onChange={onTagsChange} />
		</div>
	)
}

export function PermissionMatrix({ permissions, onChange }: PermissionMatrixProps) {
	const p = permissions

	return (
		<div className="space-y-3">
			<PermissionRow
				label="Filesystem"
				tags={p.filesystem.paths}
				tagPlaceholder="Add path..."
				onTagsChange={(paths) => onChange({ ...p, filesystem: { ...p.filesystem, paths } })}
			>
				<PermToggle
					enabled={p.filesystem.read}
					onToggle={() =>
						onChange({ ...p, filesystem: { ...p.filesystem, read: !p.filesystem.read } })
					}
					label="Read"
				/>
				<PermToggle
					enabled={p.filesystem.write}
					onToggle={() =>
						onChange({ ...p, filesystem: { ...p.filesystem, write: !p.filesystem.write } })
					}
					label="Write"
				/>
			</PermissionRow>

			<PermissionRow
				label="Network"
				tags={p.network.domains}
				tagPlaceholder="Add domain..."
				onTagsChange={(domains) => onChange({ ...p, network: { ...p.network, domains } })}
			>
				<PermToggle
					enabled={p.network.outbound}
					onToggle={() =>
						onChange({ ...p, network: { ...p.network, outbound: !p.network.outbound } })
					}
					label="Outbound"
				/>
			</PermissionRow>

			<PermissionRow
				label="Shell"
				tags={p.shell.allowedCommands}
				tagPlaceholder="Add command..."
				onTagsChange={(cmds) => onChange({ ...p, shell: { ...p.shell, allowedCommands: cmds } })}
			>
				<PermToggle
					enabled={p.shell.execute}
					onToggle={() => onChange({ ...p, shell: { ...p.shell, execute: !p.shell.execute } })}
					label="Execute"
				/>
			</PermissionRow>

			<PermissionRow
				label="Environment"
				tags={p.env.keys}
				tagPlaceholder="Add key..."
				onTagsChange={(keys) => onChange({ ...p, env: { ...p.env, keys } })}
			>
				<PermToggle
					enabled={p.env.read}
					onToggle={() => onChange({ ...p, env: { ...p.env, read: !p.env.read } })}
					label="Read"
				/>
			</PermissionRow>
		</div>
	)
}
