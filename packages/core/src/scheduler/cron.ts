export interface CronFields {
	minute: number[]
	hour: number[]
	dayOfMonth: number[]
	month: number[]
	dayOfWeek: number[]
}

function parseField(field: string, min: number, max: number): number[] {
	const values: number[] = []

	for (const part of field.split(',')) {
		if (part.includes('/')) {
			const segments = part.split('/')
			const range = segments[0] ?? '*'
			const step = parseInt(segments[1] ?? '1', 10)
			let start = min
			let end = max
			if (range !== '*') {
				if (range.includes('-')) {
					const bounds = range.split('-')
					start = parseInt(bounds[0] ?? '0', 10)
					end = parseInt(bounds[1] ?? '0', 10)
				} else {
					start = parseInt(range, 10)
				}
			}
			for (let i = start; i <= end; i += step) {
				values.push(i)
			}
		} else if (part.includes('-')) {
			const bounds = part.split('-')
			const start = parseInt(bounds[0] ?? '0', 10)
			const end = parseInt(bounds[1] ?? '0', 10)
			for (let i = start; i <= end; i++) {
				values.push(i)
			}
		} else if (part === '*') {
			for (let i = min; i <= max; i++) {
				values.push(i)
			}
		} else {
			const val = parseInt(part, 10)
			if (!Number.isNaN(val)) values.push(val)
		}
	}

	return [...new Set(values)].sort((a, b) => a - b)
}

export function parseCron(expression: string): CronFields {
	const parts = expression.trim().split(/\s+/)
	if (parts.length !== 5) {
		throw new Error(`Invalid cron expression: expected 5 fields, got ${parts.length}`)
	}

	return {
		minute: parseField(parts[0] ?? '*', 0, 59),
		hour: parseField(parts[1] ?? '*', 0, 23),
		dayOfMonth: parseField(parts[2] ?? '*', 1, 31),
		month: parseField(parts[3] ?? '*', 1, 12),
		dayOfWeek: parseField(parts[4] ?? '*', 0, 6),
	}
}

export function getNextRun(expression: string, after?: Date): Date {
	const fields = parseCron(expression)
	const date = new Date(after ?? Date.now())
	date.setSeconds(0, 0)
	date.setMinutes(date.getMinutes() + 1)

	const limit = new Date(date.getTime() + 4 * 365 * 24 * 60 * 60 * 1000)

	while (date < limit) {
		if (!fields.month.includes(date.getMonth() + 1)) {
			date.setMonth(date.getMonth() + 1, 1)
			date.setHours(0, 0, 0, 0)
			continue
		}
		if (!fields.dayOfMonth.includes(date.getDate())) {
			date.setDate(date.getDate() + 1)
			date.setHours(0, 0, 0, 0)
			continue
		}
		if (!fields.dayOfWeek.includes(date.getDay())) {
			date.setDate(date.getDate() + 1)
			date.setHours(0, 0, 0, 0)
			continue
		}
		if (!fields.hour.includes(date.getHours())) {
			date.setHours(date.getHours() + 1, 0, 0, 0)
			continue
		}
		if (!fields.minute.includes(date.getMinutes())) {
			date.setMinutes(date.getMinutes() + 1, 0, 0)
			continue
		}
		return new Date(date)
	}

	throw new Error('No matching time found within 4 years')
}

export function isValidCron(expression: string): boolean {
	try {
		parseCron(expression)
		return true
	} catch {
		return false
	}
}
