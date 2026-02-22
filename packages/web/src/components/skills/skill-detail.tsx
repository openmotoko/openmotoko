import * as Dialog from '@radix-ui/react-dialog'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Puzzle, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Skill, SkillPermissions } from '../../lib/api'
import { api } from '../../lib/api'
import { PermissionMatrix } from './permission-matrix'

interface SkillDetailProps {
	skill: Skill | null
	open: boolean
	onClose: () => void
}

export function SkillDetail({ skill, open, onClose }: SkillDetailProps) {
	const queryClient = useQueryClient()
	const [confirmUninstall, setConfirmUninstall] = useState(false)

	useEffect(() => {
		setConfirmUninstall(false)
	}, [])

	const skillId = skill?.id ?? ''

	const { data: permissions } = useQuery({
		queryKey: ['skill-permissions', skillId],
		queryFn: () => api.getSkillPermissions(skillId),
		enabled: !!skill,
	})

	const updatePerms = useMutation({
		mutationFn: (perms: SkillPermissions) => api.updateSkillPermissions(skillId, perms),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skill-permissions', skillId] }),
	})

	const uninstall = useMutation({
		mutationFn: () => api.uninstallSkill(skillId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['skills'] })
			onClose()
		},
	})

	return (
		<Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
			<AnimatePresence>
				{open && (
					<Dialog.Portal forceMount>
						<Dialog.Overlay forceMount asChild>
							<motion.div
								className="fixed inset-0 bg-[var(--overlay)] z-50"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
							/>
						</Dialog.Overlay>
						<Dialog.Content forceMount asChild>
							<motion.div
								className="fixed top-0 right-0 h-full w-full max-w-md bg-shell border-l border-[var(--ghost-border)] z-50 overflow-y-auto"
								initial={{ x: '100%' }}
								animate={{ x: 0 }}
								exit={{ x: '100%' }}
								transition={{ type: 'spring', damping: 30, stiffness: 300 }}
							>
								{skill && (
									<div className="p-6 space-y-6">
										<div className="flex items-start justify-between">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 bg-ghost-muted flex items-center justify-center cut-hex flex-shrink-0">
													<Puzzle size={18} className="text-ghost" />
												</div>
												<div>
													<Dialog.Title className="font-display font-semibold text-sm text-chrome">
														{skill.name}
													</Dialog.Title>
													<span className="text-xs font-code text-static">v{skill.version}</span>
												</div>
											</div>
											<Dialog.Close asChild>
												<button
													type="button"
													className="text-static hover:text-chrome transition-colors p-1"
												>
													<X size={16} />
												</button>
											</Dialog.Close>
										</div>

										<Dialog.Description className="text-xs font-body text-static leading-relaxed">
											{skill.description}
										</Dialog.Description>

										{permissions && (
											<div>
												<span className="text-xs font-ui font-bold text-chrome uppercase tracking-wider block mb-3">
													Permissions
												</span>
												<PermissionMatrix
													permissions={permissions}
													onChange={(p) => updatePerms.mutate(p)}
												/>
											</div>
										)}

										{skill.manifest.tools.length > 0 && (
											<div>
												<span className="text-xs font-ui font-bold text-chrome uppercase tracking-wider block mb-2">
													Tools
												</span>
												<div className="space-y-2">
													{skill.manifest.tools.map((tool) => (
														<div
															key={tool.name}
															className="bg-[rgba(74,96,112,0.06)] p-3 cut-tr"
															style={{ '--cut-md': '8px' } as React.CSSProperties}
														>
															<span className="text-xs font-code text-ghost block">
																{tool.name}
															</span>
															<span className="text-xs font-body text-static">
																{tool.description}
															</span>
														</div>
													))}
												</div>
											</div>
										)}

										<div className="border-t border-[var(--border-default)] pt-4">
											{!confirmUninstall ? (
												<button
													type="button"
													onClick={() => setConfirmUninstall(true)}
													className="flex items-center gap-2 text-xs font-ui font-bold uppercase tracking-wider text-pulse hover:text-[var(--pulse-hover)] transition-colors"
												>
													<Trash2 size={12} />
													Uninstall
												</button>
											) : (
												<div className="flex items-center gap-3">
													<span className="text-xs font-ui text-pulse">Confirm?</span>
													<button
														type="button"
														onClick={() => uninstall.mutate()}
														className="px-3 py-1 text-xs font-ui font-bold uppercase bg-pulse-muted text-pulse cut-tr transition-all hover:bg-pulse/20"
														style={{ '--cut-md': '6px' } as React.CSSProperties}
													>
														Yes
													</button>
													<button
														type="button"
														onClick={() => setConfirmUninstall(false)}
														className="px-3 py-1 text-xs font-ui font-bold uppercase text-static hover:text-chrome transition-colors"
													>
														Cancel
													</button>
												</div>
											)}
										</div>
									</div>
								)}
							</motion.div>
						</Dialog.Content>
					</Dialog.Portal>
				)}
			</AnimatePresence>
		</Dialog.Root>
	)
}
