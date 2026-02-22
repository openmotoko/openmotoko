import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart'

export async function getAutoLaunchEnabled(): Promise<boolean> {
	try {
		return await isEnabled()
	} catch {
		return false
	}
}

export async function setAutoLaunch(enabled: boolean): Promise<void> {
	if (enabled) {
		await enable()
	} else {
		await disable()
	}
}
