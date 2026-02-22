import { useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePwaInstall() {
	const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
	const [isInstalled, setIsInstalled] = useState(false)
	const [dismissed, setDismissed] = useState(
		() => localStorage.getItem('openmotoko-pwa-dismissed') === '1',
	)

	useEffect(() => {
		if (window.matchMedia('(display-mode: standalone)').matches) {
			setIsInstalled(true)
			return
		}

		const handler = (e: Event) => {
			e.preventDefault()
			setInstallPrompt(e as BeforeInstallPromptEvent)
		}

		window.addEventListener('beforeinstallprompt', handler)
		return () => window.removeEventListener('beforeinstallprompt', handler)
	}, [])

	const install = useCallback(async () => {
		if (!installPrompt) return
		await installPrompt.prompt()
		const { outcome } = await installPrompt.userChoice
		if (outcome === 'accepted') {
			setIsInstalled(true)
		}
		setInstallPrompt(null)
	}, [installPrompt])

	const dismiss = useCallback(() => {
		setDismissed(true)
		localStorage.setItem('openmotoko-pwa-dismissed', '1')
	}, [])

	return {
		canInstall: !!installPrompt && !isInstalled && !dismissed,
		isInstalled,
		install,
		dismiss,
	}
}
