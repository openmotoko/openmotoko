const observer = new IntersectionObserver(
	(entries) => {
		for (const entry of entries) {
			if (entry.isIntersecting) {
				entry.target.classList.add('visible')
				observer.unobserve(entry.target)
			}
		}
	},
	{ threshold: 0.12, rootMargin: '0px 0px -60px 0px' },
)

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))

const form = document.getElementById('waitlist-form') as HTMLFormElement | null
const successEl = document.getElementById('waitlist-success')
const errorEl = document.getElementById('waitlist-error')

form?.addEventListener('submit', async (e) => {
	e.preventDefault()

	const input = form.querySelector('input[type="email"]') as HTMLInputElement
	const email = input?.value.trim()
	if (!email) return

	const submit = form.querySelector('button') as HTMLButtonElement
	submit.textContent = '...'
	submit.disabled = true

	if (errorEl) {
		errorEl.classList.remove('visible')
		errorEl.textContent = ''
	}

	try {
		await new Promise((resolve) => setTimeout(resolve, 800))

		const terminal = form.closest('.waitlist-terminal') as HTMLElement | null
		if (terminal) terminal.style.display = 'none'
		successEl?.classList.add('visible')
	} catch {
		if (errorEl) {
			errorEl.textContent = 'Something went wrong. Please try again.'
			errorEl.classList.add('visible')
		}
		submit.textContent = 'ENTER'
		submit.disabled = false
	}
})
