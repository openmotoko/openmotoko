import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'

export interface UpdateInfo {
	available: boolean
	version?: string
	date?: string
	body?: string
}

export async function checkUpdate(): Promise<UpdateInfo> {
	try {
		const update = await check()
		if (update) {
			return {
				available: true,
				version: update.version,
				date: update.date,
				body: update.body ?? undefined,
			}
		}
		return { available: false }
	} catch {
		return { available: false }
	}
}

export async function installUpdate(): Promise<void> {
	const update = await check()
	if (update) {
		await update.downloadAndInstall()
		await relaunch()
	}
}
