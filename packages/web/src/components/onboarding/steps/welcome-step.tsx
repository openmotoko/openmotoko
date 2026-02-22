import { motion } from 'framer-motion'
import { ArrowRight, MessageSquare, Settings } from 'lucide-react'
import type { OnboardingData } from '../types'

interface WelcomeStepProps {
	data: OnboardingData
	onComplete: () => void
}

export function WelcomeStep({ data, onComplete }: WelcomeStepProps) {
	return (
		<div className="flex flex-col items-center text-center py-8">
			<motion.div
				initial={{ scale: 0.8, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
				className="relative mb-8"
			>
				<div className="w-24 h-24 bg-alive/10 flex items-center justify-center cut-hex">
					<motion.div
						animate={{
							boxShadow: [
								'0 0 20px rgba(57,255,20,0.3)',
								'0 0 40px rgba(57,255,20,0.6)',
								'0 0 20px rgba(57,255,20,0.3)',
							],
						}}
						transition={{ duration: 2, repeat: Infinity }}
						className="w-16 h-16 bg-alive/20 flex items-center justify-center cut-hex"
					>
						<span className="text-2xl font-display font-bold text-alive">OK</span>
					</motion.div>
				</div>
			</motion.div>

			<h2 className="font-display font-bold text-2xl text-chrome mb-2">You are all set</h2>
			<p className="text-sm font-body text-static mb-8 max-w-md">
				Your agent is configured and ready. Start a conversation or fine-tune settings anytime.
			</p>

			<div className="flex flex-wrap justify-center gap-3 mb-10 text-xs font-code text-static">
				{data.provider && (
					<span className="px-3 py-1 bg-ghost-muted text-ghost cut-chevron capitalize">
						{data.provider}
					</span>
				)}
				{data.model && (
					<span className="px-3 py-1 bg-ghost-muted text-ghost cut-chevron">{data.model}</span>
				)}
				{data.enabledSkills.length > 0 && (
					<span className="px-3 py-1 bg-alive-muted text-alive cut-chevron">
						{data.enabledSkills.length} skills active
					</span>
				)}
			</div>

			<motion.button
				type="button"
				whileHover={{ scale: 1.02 }}
				whileTap={{ scale: 0.98 }}
				onClick={onComplete}
				className="flex items-center gap-2 px-8 py-3 bg-ghost text-void font-ui text-sm font-bold uppercase tracking-wider cut-tr hover:drop-shadow-[0_0_16px_rgba(0,240,255,0.5)] transition-all"
				style={{ '--cut-md': '10px' } as React.CSSProperties}
			>
				<MessageSquare size={16} />
				Start your first conversation
				<ArrowRight size={16} />
			</motion.button>

			<a
				href="/settings"
				className="flex items-center gap-2 mt-6 text-xs font-ui text-static hover:text-ghost transition-colors"
			>
				<Settings size={12} />
				Open Settings
			</a>
		</div>
	)
}
