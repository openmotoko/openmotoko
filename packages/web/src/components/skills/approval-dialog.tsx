import { AnimatePresence, motion } from 'framer-motion'
import { Shield, Timer } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface PermissionRequest {
	id: string
	skillName: string
	skillId: string
	permission: string
	detail: string
}

interface ApprovalDialogProps {
	request: PermissionRequest | null
	onApprove: (id: string, remember: boolean) => void
	onDeny: (id: string) => void
}

const AUTO_DENY_SECONDS = 30

export function ApprovalDialog({ request, onApprove, onDeny }: ApprovalDialogProps) {
	const [remember, setRemember] = useState(false)
	const [remaining, setRemaining] = useState(AUTO_DENY_SECONDS)
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

	const deny = useCallback(() => {
		if (request) onDeny(request.id)
	}, [request, onDeny])

	useEffect(() => {
		if (!request) return
		setRemember(false)
		setRemaining(AUTO_DENY_SECONDS)
		timerRef.current = setInterval(() => {
			setRemaining((prev) => {
				if (prev <= 1) {
					deny()
					return 0
				}
				return prev - 1
			})
		}, 1000)
		return () => {
			if (timerRef.current) clearInterval(timerRef.current)
		}
	}, [request, deny])

	return (
		<AnimatePresence>
			{request && (
				<motion.div
					className="fixed inset-0 z-[60] flex items-center justify-center"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					<div className="absolute inset-0 bg-[var(--overlay)]" />
					<motion.div
						className="relative w-full max-w-sm mx-4 scanlines"
						initial={{ scale: 0.9, y: 20 }}
						animate={{ scale: 1, y: 0 }}
						exit={{ scale: 0.9, y: 20 }}
						transition={{ type: 'spring', damping: 25, stiffness: 350 }}
					>
						<div
							className="bg-shell border border-[var(--ghost-border)] p-6 shadow-[0_0_30px_rgba(0,240,255,0.15)]"
							style={{
								clipPath:
									'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
							}}
						>
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center gap-2">
									<Shield size={14} className="text-edge" />
									<span className="text-xs font-ui font-bold text-edge uppercase tracking-wider">
										Permission Request
									</span>
								</div>
								<div className="flex items-center gap-1.5 text-xs font-code text-pulse">
									<Timer size={12} />
									{remaining}s
								</div>
							</div>

							<div className="h-px bg-[var(--border-default)] mb-4 overflow-hidden">
								<motion.div
									className="h-full bg-ghost"
									initial={{ width: '100%' }}
									animate={{ width: '0%' }}
									transition={{ duration: AUTO_DENY_SECONDS, ease: 'linear' }}
									key={request.id}
								/>
							</div>

							<div className="mb-4">
								<span className="text-xs font-code text-ghost block mb-1">{request.skillName}</span>
								<p className="text-xs font-body text-chrome">{request.permission}</p>
								<p className="text-xs font-body text-static mt-1">{request.detail}</p>
							</div>

							<label className="flex items-center gap-2 mb-4 cursor-pointer group">
								<span
									className={`w-4 h-4 border flex items-center justify-center transition-all ${
										remember
											? 'border-[var(--ghost-border)] bg-ghost-muted'
											: 'border-[var(--border-default)] group-hover:border-[var(--border-hover)]'
									}`}
								>
									{remember && <span className="w-2 h-2 bg-ghost" />}
								</span>
								<input
									type="checkbox"
									checked={remember}
									onChange={(e) => setRemember(e.target.checked)}
									className="sr-only"
								/>
								<span className="text-xs font-ui text-static group-hover:text-chrome transition-colors">
									Remember for this session
								</span>
							</label>

							<div className="flex gap-3">
								<button
									type="button"
									onClick={() => onApprove(request.id, remember)}
									className="flex-1 py-2 text-xs font-ui font-bold uppercase tracking-wider bg-alive-muted text-alive border border-[var(--alive-border)] cut-tr transition-all hover:bg-alive/20"
									style={{ '--cut-md': '6px' } as React.CSSProperties}
								>
									Approve
								</button>
								<button
									type="button"
									onClick={deny}
									className="flex-1 py-2 text-xs font-ui font-bold uppercase tracking-wider bg-pulse-muted text-pulse border border-[var(--pulse-border)] cut-tr transition-all hover:bg-pulse/20"
									style={{ '--cut-md': '6px' } as React.CSSProperties}
								>
									Deny
								</button>
							</div>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
