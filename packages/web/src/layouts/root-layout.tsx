import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { Outlet } from 'react-router'
import { Sidebar } from '../components/sidebar/sidebar'
import { useWebSocket } from '../hooks/use-websocket'
import { useStore } from '../lib/store'

export function RootLayout() {
	const { sidebarOpen, toggleSidebar } = useStore()
	useWebSocket()

	return (
		<div className="flex h-full w-full bg-void grid-bg">
			<AnimatePresence mode="wait">
				{sidebarOpen && (
					<motion.aside
						initial={{ width: 0, opacity: 0 }}
						animate={{ width: 260, opacity: 1 }}
						exit={{ width: 0, opacity: 0 }}
						transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
						className="h-full flex-shrink-0 overflow-hidden border-r border-[var(--border-default)]"
					>
						<Sidebar />
					</motion.aside>
				)}
			</AnimatePresence>

			<div className="flex flex-1 flex-col min-w-0 h-full">
				<header className="flex items-center h-12 px-4 border-b border-[var(--border-default)] bg-shell/50 backdrop-blur-sm flex-shrink-0 md:hidden">
					<button
						type="button"
						onClick={toggleSidebar}
						className="flex items-center justify-center w-8 h-8 text-static hover:text-ghost transition-colors"
						aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
					>
						{sidebarOpen ? <X size={18} /> : <Menu size={18} />}
					</button>
				</header>

				<main className="flex-1 min-h-0 overflow-hidden">
					<Outlet />
				</main>
			</div>
		</div>
	)
}
