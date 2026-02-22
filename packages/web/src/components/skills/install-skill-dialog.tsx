import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface InstallSkillDialogProps {
	open: boolean
	onClose: () => void
	onInstall: (url: string) => void
	loading?: boolean
}

export function InstallSkillDialog({ open, onClose, onInstall, loading }: InstallSkillDialogProps) {
	const [url, setUrl] = useState('')

	useEffect(() => {
		if (open) setUrl('')
	}, [open])

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
								className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-shell border border-[var(--ghost-border)] p-6 z-50 cut-tr cut-border"
								style={{ '--cut-md': '14px' } as React.CSSProperties}
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
							>
								<div className="flex items-center justify-between mb-4">
									<Dialog.Title className="font-display font-semibold text-sm text-chrome flex items-center gap-2">
										<Download size={14} className="text-ghost" />
										Install Skill
									</Dialog.Title>
									<Dialog.Close asChild>
										<button
											type="button"
											className="text-static hover:text-chrome transition-colors p-1"
										>
											<X size={14} />
										</button>
									</Dialog.Close>
								</div>
								<Dialog.Description className="sr-only">
									Install a new skill from a URL
								</Dialog.Description>
								<form
									onSubmit={(e) => {
										e.preventDefault()
										if (url.trim()) onInstall(url.trim())
									}}
								>
									<input
										value={url}
										onChange={(e) => setUrl(e.target.value)}
										placeholder="Skill manifest URL or git repo..."
										className="w-full bg-void border border-[var(--border-default)] text-xs font-code text-chrome px-3 py-2 outline-none focus:border-[var(--ghost-border)] transition-colors placeholder:text-static/50"
									/>
									<button
										type="submit"
										disabled={!url.trim() || loading}
										className="mt-3 w-full py-2 text-xs font-ui font-bold uppercase tracking-wider bg-ghost-muted text-ghost border border-[var(--ghost-border)] cut-tr transition-all hover:bg-ghost/20 disabled:opacity-40 disabled:cursor-not-allowed"
										style={{ '--cut-md': '6px' } as React.CSSProperties}
									>
										{loading ? 'Installing...' : 'Install'}
									</button>
								</form>
							</motion.div>
						</Dialog.Content>
					</Dialog.Portal>
				)}
			</AnimatePresence>
		</Dialog.Root>
	)
}
