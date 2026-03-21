import {
	Activity,
	Clock,
	DollarSign,
	Layers,
	MessageSquare,
	Puzzle,
	Settings,
	Shield,
} from 'lucide-react'
import { useStore } from '../../lib/store'
import { GlitchText } from '../shared/glitch-text'
import { ConversationList } from './conversation-list'
import { NavItem } from './nav-item'

export function Sidebar() {
	const wsConnected = useStore((s) => s.wsConnected)

	return (
		<nav aria-label="Main navigation" className="flex flex-col h-full w-[260px] bg-shell">
			<div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border-default)]">
				<div className="w-8 h-8 bg-ghost-muted flex items-center justify-center cut-hex flex-shrink-0">
					<span className="text-ghost font-display font-bold text-sm">M</span>
				</div>
				<div className="flex flex-col min-w-0">
					<GlitchText
						text="OPENMOTOKO"
						className="font-display font-bold text-sm text-chrome tracking-wider"
					/>
					<output className="flex items-center gap-1.5 mt-0.5" aria-live="polite">
						<div
							className={`w-1.5 h-1.5 rounded-full ${
								wsConnected ? 'bg-alive animate-ghost-pulse' : 'bg-static'
							}`}
						/>
						<span className="text-xs font-ui text-static">
							{wsConnected ? 'ONLINE' : 'OFFLINE'}
						</span>
					</output>
				</div>
			</div>

			<div className="py-2 border-b border-[var(--border-default)]">
				<NavItem to="/chat" label="Chat" icon={MessageSquare} />
				<NavItem to="/activity" label="Activity" icon={Activity} />
				<NavItem to="/costs" label="Costs" icon={DollarSign} />
				<NavItem to="/skills" label="Skills" icon={Puzzle} />
				<NavItem to="/scheduler" label="Scheduler" icon={Clock} />
				<NavItem to="/canvas" label="Canvas" icon={Layers} />
				<NavItem to="/security" label="Security" icon={Shield} />
				<NavItem to="/settings" label="Settings" icon={Settings} />
			</div>

			<ConversationList />
		</nav>
	)
}
