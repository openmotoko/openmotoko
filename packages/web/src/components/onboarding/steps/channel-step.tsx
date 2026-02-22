import { motion } from 'framer-motion'
import { Hash, MessageCircle, MessageSquare, MessagesSquare, Send, Shield } from 'lucide-react'
import type { StepProps } from '../types'

const CHANNELS = [
	{
		id: 'telegram',
		name: 'Telegram',
		icon: Send,
		hint: 'Create a bot via @BotFather on Telegram, then paste the token in Settings',
	},
	{
		id: 'whatsapp',
		name: 'WhatsApp',
		icon: MessageCircle,
		hint: 'Uses Baileys for WhatsApp Web protocol. Link your number in Settings',
	},
	{
		id: 'discord',
		name: 'Discord',
		icon: Hash,
		hint: 'Create a Bot Application in the Discord Developer Portal',
	},
	{
		id: 'slack',
		name: 'Slack',
		icon: MessagesSquare,
		hint: 'Install as a Slack App via Bolt SDK integration',
	},
	{
		id: 'signal',
		name: 'Signal',
		icon: Shield,
		hint: 'Requires signal-cli installed on the host machine',
	},
	{
		id: 'imessage',
		name: 'iMessage',
		icon: MessageSquare,
		hint: 'Requires BlueBubbles server running on macOS',
	},
] as const

export function ChannelStep({ data, onChange }: StepProps) {
	const toggleChannel = (id: string) => {
		const current = data.channels ?? []
		const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id]
		onChange({ channels: next })
	}
	const active = CHANNELS.find((c) => data.channels?.includes(c.id))

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-display font-bold text-lg text-chrome mb-1">Connect channels</h2>
				<p className="text-sm font-body text-chrome/60">
					Reach your agent from any messaging platform. This is optional.
				</p>
			</div>

			<div className="grid grid-cols-2 gap-3">
				{CHANNELS.map((ch, i) => (
					<motion.button
						key={ch.id}
						type="button"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: i * 0.05 }}
						whileTap={{ scale: 0.97 }}
					onClick={() => toggleChannel(ch.id)}
					className={`text-left p-4 border transition-all cut-tr cut-border ${
						data.channels?.includes(ch.id)
							? 'bg-ghost-muted border-[var(--ghost-border)]'
							: 'bg-shell border-[var(--border-default)] hover:border-static'
					}`}
						style={{ '--cut-md': '8px' } as React.CSSProperties}
					>
						<div className="flex items-center gap-3">
							<div
								className={`w-8 h-8 flex items-center justify-center cut-hex flex-shrink-0 ${
									data.channels?.includes(ch.id) ? 'bg-ghost/20' : 'bg-void/50'
								}`}
							>
								<ch.icon size={14} className={data.channels?.includes(ch.id) ? 'text-ghost' : 'text-static'} />
							</div>
							<span
								className={`font-ui font-bold text-sm ${data.channels?.includes(ch.id) ? 'text-ghost' : 'text-chrome'}`}
							>
								{ch.name}
							</span>
						</div>
					</motion.button>
				))}
			</div>

			{active && (
				<motion.div
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					className="p-4 bg-shell border border-[var(--ghost-border)] cut-tr cut-border"
					style={{ '--cut-md': '8px' } as React.CSSProperties}
				>
					<span className="text-xs font-ui font-bold text-ghost uppercase tracking-wider block mb-2">
						{active.name} Setup
					</span>
				<p className="text-xs font-body text-chrome/50 leading-relaxed">{active.hint}</p>
				<p className="text-xs font-body text-chrome/35 mt-2">
						Configure in Settings after completing setup.
					</p>
				</motion.div>
			)}
		</div>
	)
}
