import { Command } from 'commander'

export const configureCommand = new Command('configure')
	.description('View and manage OpenMotoko configuration')

configureCommand
	.command('show')
	.description('Show current configuration')
	.action(async () => {
		const { getConfig } = await import('@openmotoko/core')
		const config = getConfig()
		console.log(JSON.stringify(config, null, 2))
	})

configureCommand
	.command('init')
	.description('Create default configuration file')
	.action(async () => {
		const { writeDefaultConfig } = await import('@openmotoko/core')
		const path = writeDefaultConfig()
		console.log(`Configuration file created at: ${path}`)
	})

configureCommand
	.command('path')
	.description('Show configuration directory path')
	.action(async () => {
		const { getConfigDir } = await import('@openmotoko/core')
		console.log(getConfigDir())
	})

configureCommand
	.command('set <key> <value>')
	.description('Set a configuration value (dot-notation)')
	.action(async (key, value) => {
		const { readFileSync, writeFileSync, existsSync } = await import('node:fs')
		const { join } = await import('node:path')
		const { getConfigDir } = await import('@openmotoko/core')

		const configPath = join(getConfigDir(), 'openmotoko.json')
		if (!existsSync(configPath)) {
			const { writeDefaultConfig } = await import('@openmotoko/core')
			writeDefaultConfig()
		}

		const raw = readFileSync(configPath, 'utf-8')
		const config = JSON.parse(raw)

		const keys = key.split('.')
		let target = config
		for (let i = 0; i < keys.length - 1; i++) {
			if (!(keys[i] in target)) target[keys[i]] = {}
			target = target[keys[i]]
		}

		let parsed: unknown
		try {
			parsed = JSON.parse(value)
		} catch {
			parsed = value
		}
		target[keys[keys.length - 1]] = parsed

		writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
		console.log(`Set ${key} = ${JSON.stringify(parsed)}`)
	})

configureCommand
	.command('get <key>')
	.description('Get a configuration value (dot-notation)')
	.action(async (key) => {
		const { getConfig } = await import('@openmotoko/core')
		const config = getConfig()

		const keys = key.split('.')
		let target: unknown = config
		for (const k of keys) {
			if (target == null || typeof target !== 'object') {
				console.log('undefined')
				return
			}
			target = (target as Record<string, unknown>)[k]
		}

		if (typeof target === 'object') {
			console.log(JSON.stringify(target, null, 2))
		} else {
			console.log(String(target))
		}
	})
