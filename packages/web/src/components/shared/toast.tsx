import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Check, Info, X } from 'lucide-react'
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
	id: string
	type: ToastType
	message: string
}

interface ToastContextValue {
	toast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
	return useContext(ToastContext)
}

const icons: Record<ToastType, typeof Check> = {
	success: Check,
	error: AlertTriangle,
	info: Info,
	warning: AlertTriangle,
}

const styles: Record<ToastType, string> = {
	success: 'border-[var(--alive-border)] bg-alive/10 text-alive',
	error: 'border-[var(--pulse-border)] bg-pulse/10 text-pulse',
	info: 'border-[var(--ghost-border)] bg-ghost/10 text-ghost',
	warning: 'border-[var(--edge-border)] bg-edge/10 text-edge',
}

let counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([])

	const addToast = useCallback((type: ToastType, message: string) => {
		const id = `toast-${++counter}`
		setToasts((prev) => [...prev, { id, type, message }])
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id))
		}, 4000)
	}, [])

	const removeToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id))
	}, [])

	return (
		<ToastContext.Provider value={{ toast: addToast }}>
			{children}
			<div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
				<AnimatePresence>
					{toasts.map((t) => {
						const Icon = icons[t.type]
						return (
							<motion.div
								key={t.id}
								initial={{ opacity: 0, x: 50, scale: 0.95 }}
								animate={{ opacity: 1, x: 0, scale: 1 }}
								exit={{ opacity: 0, x: 50, scale: 0.95 }}
								className={`flex items-center gap-2 px-4 py-2.5 border bg-shell backdrop-blur-sm cut-tr-sm shadow-lg pointer-events-auto min-w-[250px] max-w-sm ${styles[t.type]}`}
							>
								<Icon size={16} className="shrink-0" />
								<p className="text-sm font-ui flex-1 text-chrome">{t.message}</p>
								<button
									type="button"
									onClick={() => removeToast(t.id)}
									className="text-static hover:text-chrome transition-colors shrink-0"
									aria-label="Dismiss notification"
								>
									<X size={14} />
								</button>
							</motion.div>
						)
					})}
				</AnimatePresence>
			</div>
		</ToastContext.Provider>
	)
}
