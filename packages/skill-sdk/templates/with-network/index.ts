import { readFile } from 'node:fs/promises'
import { defineSkill, formatError, formatToolResult } from '@openmotoko/skill-sdk'

const raw = await readFile(new URL('./manifest.json', import.meta.url), 'utf-8')
const manifest = JSON.parse(raw)

export default defineSkill(manifest, async (toolName, args, ctx) => {
	ctx.log(`Executing ${toolName}`)

	if (toolName.endsWith('_fetch')) {
		try {
			const url = args.url as string
			const res = await fetch(url)
			if (!res.ok) return formatError(`HTTP ${res.status}: ${res.statusText}`)
			const text = await res.text()
			return formatToolResult({ status: res.status, body: text.slice(0, 10000) })
		} catch (err) {
			return formatError(err)
		}
	}

	return formatError(`Unknown tool: ${toolName}`)
})
