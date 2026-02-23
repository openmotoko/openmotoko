import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
				skills: resolve(__dirname, 'skills/index.html'),
			},
		},
	},
	server: {
		port: 3456,
	},
})
