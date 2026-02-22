import { getCurrentWindow } from '@tauri-apps/api/window'
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart'
import { onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { register } from '@tauri-apps/plugin-global-shortcut'
import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'

export async function initDesktopFeatures() {
	await registerShortcuts()
	await setupDeepLinks()
	await checkForUpdates()
}

async function registerShortcuts() {
	try {
		await register('CmdOrCtrl+Shift+M', (event) => {
			if (event.state === 'Pressed') {
				const win = getCurrentWindow()
				win.isVisible().then((visible: boolean) => {
					if (visible) {
						win.hide()
					} else {
						win.show()
						win.setFocus()
					}
				})
			}
		})
	} catch {}
}

async function setupDeepLinks() {
	try {
		await onOpenUrl((urls) => {
			for (const url of urls) {
				const parsed = new URL(url)
				if (parsed.protocol === 'openmotoko:') {
					const path = parsed.pathname.replace(/^\/\//, '/')
					window.location.hash = path
				}
			}
		})
	} catch {}
}

async function checkForUpdates() {
	try {
		const update = await check()
		if (update) {
			await update.downloadAndInstall()
			await relaunch()
		}
	} catch {}
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
