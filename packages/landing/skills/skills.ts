const REGISTRY_URL = 'https://registry.openmotoko.ai'

interface Skill {
	id: string
	name: string
	version: string
	description: string
	author: string
	downloads: number
	rating: number
	rating_count: number
	verified: boolean
	tags: string[]
}

interface ScanResult {
	grade: string
	score: number
	findings: { severity: string }[]
	scanned_files: number
}

const gradeColors: Record<string, string> = {
	A: '#00ffa3',
	B: '#7affcf',
	C: '#ffcc00',
	D: '#ff8c42',
	F: '#ff3366',
}

function gradeEl(grade: string): string {
	const color = gradeColors[grade] || 'var(--ghost)'
	return `<span class="skill-grade" style="border-color:${color};color:${color}">${grade}</span>`
}

function skillCard(skill: Skill, scan: ScanResult | null): string {
	const grade = scan ? gradeEl(scan.grade) : '<span class="skill-grade">?</span>'
	const stars = skill.rating > 0 ? `${skill.rating.toFixed(1)} / 5` : 'No ratings'
	const dl = skill.downloads > 0 ? `${skill.downloads} downloads` : 'New'

	return `
		<div class="skill-card" data-name="${skill.name.toLowerCase()}" data-id="${skill.id}">
			<div class="skill-header">
				<div class="skill-name-row">
					<h3>${skill.name}</h3>
					${grade}
				</div>
				<span class="skill-version">v${skill.version}</span>
			</div>
			<p class="skill-desc">${skill.description}</p>
			<div class="skill-meta">
				<span class="skill-author">by ${skill.author}</span>
				<span class="skill-stat">${stars}</span>
				<span class="skill-stat">${dl}</span>
			</div>
			<div class="skill-install">
				<code>openmotoko install ${skill.id}</code>
			</div>
		</div>
	`
}

async function loadSkills() {
	const grid = document.getElementById('skills-grid')!
	const stats = document.getElementById('stats')!

	try {
		const res = await fetch(`${REGISTRY_URL}/api/skills`)
		const data = await res.json() as { skills: Skill[] }
		const skills = data.skills

		const scans = new Map<string, ScanResult>()
		await Promise.all(
			skills.map(async (s) => {
				try {
					const r = await fetch(`${REGISTRY_URL}/api/skills/${s.id}`)
					const detail = await r.json() as { securityScan?: ScanResult }
					if (detail.securityScan) scans.set(s.id, detail.securityScan)
				} catch { /* skip */ }
			}),
		)

		stats.innerHTML = `<span>${skills.length} skills</span><span class="stat-sep"></span><span>All security scanned</span>`

		if (skills.length === 0) {
			grid.innerHTML = '<p class="skills-empty">No skills published yet.</p>'
			return
		}

		grid.innerHTML = skills.map((s) => skillCard(s, scans.get(s.id) || null)).join('')
	} catch {
		grid.innerHTML = '<p class="skills-empty">Could not reach the registry. Try again later.</p>'
	}
}

function setupSearch() {
	const input = document.getElementById('skill-search') as HTMLInputElement
	input.addEventListener('input', () => {
		const q = input.value.toLowerCase()
		document.querySelectorAll<HTMLElement>('.skill-card').forEach((card) => {
			const name = card.dataset.name || ''
			const id = card.dataset.id || ''
			card.style.display = name.includes(q) || id.includes(q) ? '' : 'none'
		})
	})
}

loadSkills()
setupSearch()
