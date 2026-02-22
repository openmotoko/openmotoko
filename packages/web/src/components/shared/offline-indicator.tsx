import { WifiOff } from 'lucide-react'
import { useStore } from '../../lib/store'

export function OfflineIndicator() {
	const wsConnected = useStore((s) => s.wsConnected)

	if (wsConnected) return null

	return (
		<div
			className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center gap-2 py-1.5 bg-pulse/20 border-b border-(--pulse-border)"
			role="alert"
		>
			<WifiOff size={14} className="text-pulse" />
			<span className="text-xs font-ui text-pulse">Connection lost. Reconnecting...</span>
		</div>
	)
}
