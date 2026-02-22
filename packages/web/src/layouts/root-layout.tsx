import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { Navigate, Outlet } from 'react-router'
import { ErrorBoundary } from '../components/shared/error-boundary'
import { OfflineIndicator } from '../components/shared/offline-indicator'
import { PwaInstallBanner } from '../components/shared/pwa-install-banner'
import { Sidebar } from '../components/sidebar/sidebar'
import { useWebSocket } from '../hooks/use-websocket'
import { useStore } from '../lib/store'

export function RootLayout() {
	const { sidebarOpen, toggleSidebar, onboardingComplete } = useStore()
	useWebSocket()
	const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

	if (!onboardingComplete) {
		return <Navigate to="/onboard" replace />
	}

	return (
		<div className="flex h-full w-full bg-void grid-bg">
			<OfflineIndicator />
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-ghost focus:text-void focus:font-ui focus:text-sm"
			>
				Skip to main content
			</a>

			{prefersReducedMotion ? (
				sidebarOpen && (
					<aside className="h-full flex-shrink-0 overflow-hidden border-r border-[var(--border-default)] w-[260px]">
						<Sidebar />
					</aside>
				)
			) : (
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
			)}

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

				<main id="main-content" className="flex-1 min-h-0 overflow-hidden">
					<ErrorBoundary>
						<Outlet />
					</ErrorBoundary>
				</main>
			</div>
			<PwaInstallBanner />
		</div>
	)
}
