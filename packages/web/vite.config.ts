import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		dedupe: ['react', 'react-dom'],
	},
	optimizeDeps: {
		include: ['react', 'react-dom'],
	},
	server: {
		port: 5173,
		proxy: {
			'/api': {
				target: 'http://localhost:3457',
				changeOrigin: true,
			},
			'/ws': {
				target: 'ws://localhost:3457',
				ws: true,
			},
		},
	},
})
