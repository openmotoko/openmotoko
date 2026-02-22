import { getCurrentWindow } from '@tauri-apps/api/window'
import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut'

export async function registerGlobalShortcuts() {
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
	} catch (err) {
		console.error('Failed to register shortcuts:', err)
	}
}

export async function unregisterShortcuts() {
	try {
		await unregisterAll()
	} catch (err) {
		console.error('Failed to unregister shortcuts:', err)
	}
}
