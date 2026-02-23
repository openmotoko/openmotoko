import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const REGISTRY_URL = process.env.REGISTRY_URL || 'https://registry.openmotoko.ai'
const API_KEY = process.env.REGISTRY_API_KEY

if (!API_KEY) {
	console.error('REGISTRY_API_KEY is required')
	process.exit(1)
}

const SKILLS_DIR = join(__dirname, '..', 'packages', 'skills', 'src')
const DIST_DIR = join(__dirname, '..', 'packages', 'skills', 'dist')

const skillDirs = readdirSync(SKILLS_DIR).filter((name) => {
	const full = join(SKILLS_DIR, name)
	return statSync(full).isDirectory() && name !== 'node_modules'
})

console.log(`Found ${skillDirs.length} skills to publish`)

const tmpDir = join(__dirname, '..', '.tmp-seed')
execSync(`rm -rf ${tmpDir} && mkdir -p ${tmpDir}`)

let published = 0
let failed = 0

for (const skill of skillDirs) {
	const manifestPath = join(SKILLS_DIR, skill, 'manifest.json')
	try {
		const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
		console.log(`\nPackaging: ${manifest.name} (${manifest.id})`)

		const pkgDir = join(tmpDir, manifest.id)
		execSync(`mkdir -p ${pkgDir}`)
		execSync(`cp ${manifestPath} ${pkgDir}/manifest.json`)

		const distSkillDir = join(DIST_DIR, skill)
		if (statSync(distSkillDir).isDirectory()) {
			execSync(`cp -r ${distSkillDir}/* ${pkgDir}/`)
		}

		const tarPath = join(tmpDir, `${manifest.id}.tar.gz`)
		execSync(`tar -czf ${tarPath} -C ${tmpDir} ${manifest.id}`)

		const curlCmd = [
			'curl',
			'-s',
			'-X POST',
			`"${REGISTRY_URL}/api/skills/publish"`,
			`-H "x-api-key: ${API_KEY}"`,
			`-F "file=@${tarPath}"`,
		].join(' ')

		const result = execSync(curlCmd, { encoding: 'utf-8' })
		const parsed = JSON.parse(result)

		if (parsed.error) {
			console.error(`  Failed: ${parsed.error}`)
			failed++
		} else {
			console.log(`  Published: ${parsed.name} v${parsed.version} (scan: ${parsed.securityScan?.grade})`)
			published++
		}
	} catch (err) {
		console.error(`  Error with ${skill}: ${(err as Error).message}`)
		failed++
	}
}

execSync(`rm -rf ${tmpDir}`)

console.log(`\nDone: ${published} published, ${failed} failed`)
