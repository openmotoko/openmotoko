export function isTraySupported(): boolean {
	return '__TAURI__' in window
}
