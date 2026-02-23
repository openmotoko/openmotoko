import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from './app'
import { ToastProvider } from './components/shared/toast'
import './styles/globals.css'

const queryClient = new QueryClient({
	mutationCache: new MutationCache({
		onError: (error) => {
			console.error('[mutation error]', error instanceof Error ? error.message : error)
		},
	}),
	defaultOptions: {
		queries: {
			staleTime: 1000 * 30,
			retry: 2,
			refetchOnWindowFocus: false,
		},
	},
})

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Missing #root element')

createRoot(rootEl).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<ToastProvider>
				<RouterProvider router={router} />
			</ToastProvider>
		</QueryClientProvider>
	</StrictMode>,
)
