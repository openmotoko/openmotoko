import { scanDirectory } from '../scanner/index.js'
import type { ScanResult } from '../scanner/index.js'

export async function runSecurityScan(
	skillDir: string,
	_manifest: Record<string, unknown>,
): Promise<ScanResult> {
	return scanDirectory(skillDir)
}
