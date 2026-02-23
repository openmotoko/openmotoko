import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface UndoToastProps {
	id: string
	description: string
	remainingMs: number
	onUndo: (id: string) => void
	onDismiss: () => void
}

export function UndoToast({ id, description, remainingMs, onUndo, onDismiss }: UndoToastProps) {
	const [remaining, setRemaining] = useState(remainingMs)

	useEffect(() => {
		const interval = setInterval(() => {
			setRemaining((prev) => {
				if (prev <= 1000) {
					clearInterval(interval)
					onDismiss()
					return 0
				}
				return prev - 1000
			})
		}, 1000)

		return () => clearInterval(interval)
	}, [onDismiss])

	return (
		<motion.div
			initial={{ opacity: 0, y: 20, scale: 0.95 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, y: 20, scale: 0.95 }}
			className="fixed bottom-6 right-6 z-50 bg-shell border border-(--edge-border) px-4 py-3 shadow-lg backdrop-blur-sm flex items-center gap-4 cut-tr"
			style={{ '--cut-md': '10px' } as React.CSSProperties}
		>
			<span className="text-sm font-body text-chrome">{description}</span>
			<button
				type="button"
				onClick={() => onUndo(id)}
				className="px-3 py-1 bg-edge/20 hover:bg-edge/30 text-edge border border-(--edge-border) text-xs font-ui transition-colors"
			>
				Undo - {Math.ceil(remaining / 1000)}s
			</button>
		</motion.div>
	)
}
