import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['packages/**/src/**/*.test.ts', 'packages/**/src/**/*.test.tsx'],
		exclude: ['**/node_modules/**', '**/dist/**', '**/landing/**', '**/desktop/**'],
		coverage: {
			provider: 'v8',
			include: ['packages/*/src/**/*.ts', 'packages/channels/*/src/**/*.ts'],
			exclude: ['**/*.test.ts', '**/index.ts', '**/types.ts'],
		},
		testTimeout: 15_000,
		pool: 'forks',
	},
})
