import { readFile } from 'node:fs/promises'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

function getConfig(env: Record<string, string | undefined>): { url: string; token: string } {
	const url = env.HOME_ASSISTANT_URL
	const token = env.HOME_ASSISTANT_TOKEN
	if (!url || !token) {
		throw new Error('HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN are required')
	}
	return { url: url.replace(/\/+$/, ''), token }
}

async function haFetch(
	env: Record<string, string | undefined>,
	path: string,
	options?: RequestInit,
): Promise<unknown> {
	const { url, token } = getConfig(env)
	const response = await fetch(`${url}/api${path}`, {
		...options,
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			...options?.headers,
		},
	})

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`Home Assistant API error: ${response.status} ${text}`)
	}

	return response.json()
}

interface HAState {
	entity_id: string
	state: string
	attributes: Record<string, unknown>
	last_changed: string
	last_updated: string
}

function formatDevice(entity: HAState): Record<string, unknown> {
	const [domain] = entity.entity_id.split('.')
	return {
		entityId: entity.entity_id,
		domain,
		state: entity.state,
		friendlyName: entity.attributes.friendly_name ?? entity.entity_id,
		attributes: entity.attributes,
		lastChanged: entity.last_changed,
		lastUpdated: entity.last_updated,
	}
}

function parseHexColor(hex: string): [number, number, number] | null {
	const clean = hex.replace(/^#/, '')
	if (clean.length !== 6) return null
	const r = Number.parseInt(clean.slice(0, 2), 16)
	const g = Number.parseInt(clean.slice(2, 4), 16)
	const b = Number.parseInt(clean.slice(4, 6), 16)
	if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
	return [r, g, b]
}

async function callService(
	env: Record<string, string | undefined>,
	domain: string,
	service: string,
	entityId: string,
	data?: Record<string, unknown>,
): Promise<unknown> {
	return haFetch(env, `/services/${domain}/${service}`, {
		method: 'POST',
		body: JSON.stringify({
			entity_id: entityId,
			...data,
		}),
	})
}

export const homeAutomation = defineSkill(manifest, async (toolName, args, ctx) => {
	switch (toolName) {
		case 'list_devices': {
			ctx.log('Listing all devices')

			try {
				const states = (await haFetch(ctx.env, '/states')) as HAState[]
				const devices = states.map(formatDevice)
				return { success: true, data: { devices, count: devices.length } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'control_device': {
			const deviceId = args.device_id as string
			const action = args.action as string
			const params = args.params as Record<string, unknown> | undefined
			ctx.log(`Controlling device ${deviceId}: ${action}`)

			try {
				const [domain] = deviceId.split('.')
				if (!domain) {
					return { success: false, error: `Invalid entity ID format: ${deviceId}` }
				}

				const result = await callService(ctx.env, domain, action, deviceId, params)
				return {
					success: true,
					data: { entityId: deviceId, action, result },
				}
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'get_device_state': {
			const deviceId = args.device_id as string
			ctx.log(`Getting state for: ${deviceId}`)

			try {
				const entity = (await haFetch(ctx.env, `/states/${deviceId}`)) as HAState
				return { success: true, data: formatDevice(entity) }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'list_scenes': {
			ctx.log('Listing scenes')

			try {
				const states = (await haFetch(ctx.env, '/states')) as HAState[]
				const scenes = states
					.filter((s) => s.entity_id.startsWith('scene.'))
					.map((s) => ({
						entityId: s.entity_id,
						name: s.attributes.friendly_name ?? s.entity_id,
						lastActivated: s.last_changed,
					}))
				return { success: true, data: { scenes, count: scenes.length } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'activate_scene': {
			const sceneId = args.scene_id as string
			ctx.log(`Activating scene: ${sceneId}`)

			try {
				await callService(ctx.env, 'scene', 'turn_on', sceneId)
				return { success: true, data: { sceneId, message: `Scene activated: ${sceneId}` } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'set_light': {
			const deviceId = args.device_id as string
			const brightness = args.brightness as number | undefined
			const color = args.color as string | undefined
			const on = args.on as boolean | undefined
			ctx.log(`Setting light ${deviceId}`)

			try {
				if (on === false) {
					await callService(ctx.env, 'light', 'turn_off', deviceId)
					return { success: true, data: { entityId: deviceId, state: 'off' } }
				}

				const serviceData: Record<string, unknown> = {}
				if (brightness !== undefined) serviceData.brightness = brightness
				if (color) {
					const rgb = parseHexColor(color)
					if (rgb) {
						serviceData.rgb_color = rgb
					} else {
						serviceData.color_name = color
					}
				}

				await callService(ctx.env, 'light', 'turn_on', deviceId, serviceData)
				return {
					success: true,
					data: {
						entityId: deviceId,
						state: 'on',
						brightness,
						color,
					},
				}
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		default:
			return { success: false, error: `Unknown tool: ${toolName}` }
	}
})
