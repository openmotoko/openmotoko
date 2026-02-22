import { onOpenUrl } from '@tauri-apps/plugin-deep-link'

export async function setupDeepLinks(navigate: (path: string) => void) {
	try {
		await onOpenUrl((urls) => {
			for (const url of urls) {
				const parsed = new URL(url)
				if (parsed.protocol === 'openmotoko:') {
					const path = parsed.pathname.replace(/^\/\//, '/')
					navigate(path)
				}
			}
		})
	} catch (err) {
		console.error('Failed to setup deep links:', err)
	}
}
