import { readFile } from 'node:fs/promises'
import { defineSkill } from '@openmotoko/skill-sdk'

const raw = await readFile(new URL('./manifest.json', import.meta.url), 'utf-8')
const manifest = JSON.parse(raw)

export default defineSkill(manifest, async (toolName, args, ctx) => {
	ctx.log(`Executing ${toolName}`)

	const input = args.input as string

	return {
		success: true,
		data: { processed: input },
	}
})
