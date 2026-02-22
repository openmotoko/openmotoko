import type { IPCMessage, SkillContext, SkillHandler, SkillManifest } from '@openmotoko/skill-sdk'

let handler: SkillHandler | null = null
let manifest: SkillManifest | null = null

function send(msg: IPCMessage) {
	process.send?.(msg)
}

async function handleMessage(msg: IPCMessage) {
	switch (msg.type) {
		case 'init': {
			try {
				manifest = msg.manifest
				const mod = await import(msg.skillPath)
				const skill =
					mod.default ??
					Object.values(mod).find(
						(v: unknown) =>
							v && typeof v === 'object' && 'handler' in (v as Record<string, unknown>),
					)
				if (!skill || typeof (skill as { handler?: unknown }).handler !== 'function') {
					send({
						type: 'error',
						requestId: null,
						message: 'Skill module must export a valid Skill object',
					})
					return
				}
				handler = (skill as { handler: SkillHandler }).handler
				send({ type: 'ready' })
			} catch (err) {
				send({
					type: 'error',
					requestId: null,
					message: err instanceof Error ? err.message : String(err),
				})
			}
			break
		}
		case 'execute': {
			if (!handler || !manifest) {
				send({
					type: 'error',
					requestId: msg.requestId,
					message: 'Skill not initialized',
				})
				return
			}
			const currentManifest = manifest
			try {
				const context: SkillContext = {
					manifest: currentManifest,
					env: process.env as Record<string, string | undefined>,
					log: (message: string) => console.log(`[${currentManifest.id}] ${message}`),
				}
				const result = await handler(msg.toolName, msg.input as Record<string, unknown>, context)
				send({ type: 'result', requestId: msg.requestId, data: result })
			} catch (err) {
				send({
					type: 'error',
					requestId: msg.requestId,
					message: err instanceof Error ? err.message : String(err),
				})
			}
			break
		}
		case 'shutdown': {
			process.exit(0)
		}
	}
}

process.on('message', (raw) => {
	handleMessage(raw as IPCMessage).catch((err) => {
		send({
			type: 'error',
			requestId: null,
			message: err instanceof Error ? err.message : String(err),
		})
	})
})
