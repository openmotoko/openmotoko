import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart'
import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'
import { setupDeepLinks } from './deep-link.js'
import { registerGlobalShortcuts } from './shortcuts.js'

export async function initDesktopFeatures() {
	await registerGlobalShortcuts()
	await setupDeepLinks((path) => {
		window.location.hash = path
	})
	await checkForUpdates()
}

async function checkForUpdates() {
	try {
		const update = await check()
		if (update) {
			await update.downloadAndInstall()
			await relaunch()
		}
	} catch (err) {
		console.error('Failed to check for updates:', err)
	}
}

export async function toggleAutostart(): Promise<boolean> {
	const enabled = await isEnabled()
	if (enabled) {
		await disable()
		return false
	}
	await enable()
	return true
}

export async function getAutostartEnabled(): Promise<boolean> {
	return isEnabled()
}
