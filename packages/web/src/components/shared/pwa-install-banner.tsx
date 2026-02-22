import { Download, X } from 'lucide-react'
import { usePwaInstall } from '../../hooks/use-pwa-install'

export function PwaInstallBanner() {
	const { canInstall, install, dismiss } = usePwaInstall()

	if (!canInstall) return null

	return (
		<div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-shell border border-(--ghost-border) cut-corners-sm shadow-lg shadow-ghost/10 max-w-md w-[calc(100%-2rem)]">
			<div className="flex-1 min-w-0">
				<p className="text-sm font-ui text-chrome">Install OpenMotoko</p>
				<p className="text-xs font-body text-static mt-0.5">Add to home screen for quick access</p>
			</div>
			<button
				type="button"
				onClick={install}
				className="flex items-center gap-1.5 px-3 py-1.5 bg-ghost text-void text-xs font-ui font-semibold cut-tr-sm hover:bg-ghost-hover transition-colors shrink-0"
			>
				<Download size={14} />
				Install
			</button>
			<button
				type="button"
				onClick={dismiss}
				className="p-1 text-static hover:text-chrome transition-colors shrink-0"
				aria-label="Dismiss install prompt"
			>
				<X size={14} />
			</button>
		</div>
	)
}
