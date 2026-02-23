import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const bump = process.argv[2] as 'major' | 'minor' | 'patch' | undefined

if (!bump || !['major', 'minor', 'patch'].includes(bump)) {
	console.error('Usage: tsx scripts/bump-version.ts <major|minor|patch>')
	process.exit(1)
}

const rootPkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))
const current = rootPkg.version as string
const [major, minor, patch_] = current.split('.').map(Number)

const next =
	bump === 'major'
		? `${major + 1}.0.0`
		: bump === 'minor'
			? `${major}.${minor + 1}.0`
			: `${major}.${minor}.${patch_ + 1}`

console.log(`${current} -> ${next}\n`)

let count = 0

function updateJson(path: string) {
	const raw = readFileSync(path, 'utf-8')
	const updated = raw.replace(`"version": "${current}"`, `"version": "${next}"`)
	if (raw !== updated) {
		writeFileSync(path, updated)
		console.log(`  ${path.replace(root + '/', '')}`)
		count++
	}
}

updateJson(join(root, 'package.json'))

function walk(dir: string) {
	for (const entry of readdirSync(dir)) {
		if (entry === 'node_modules' || entry === '.tmp-seed' || entry === 'dist' || entry === 'templates') continue
		const full = join(dir, entry)
		if (statSync(full).isDirectory()) {
			walk(full)
		} else if (entry === 'package.json' || entry === 'manifest.json' || entry === 'tauri.conf.json') {
			updateJson(full)
		}
	}
}

walk(join(root, 'packages'))

console.log(`\n${count} files updated to ${next}`)
