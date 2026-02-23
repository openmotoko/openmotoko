import { createBrowserRouter, isRouteErrorResponse, Navigate, useRouteError } from 'react-router'
import { RootLayout } from './layouts/root-layout'
import { ActivityPage } from './pages/activity'
import { CanvasPage } from './pages/canvas'
import { ChatPage } from './pages/chat'
import { CostsPage } from './pages/costs'
import { OnboardPage } from './pages/onboard'
import { SchedulerPage } from './pages/scheduler'
import { SettingsPage } from './pages/settings'
import { SkillsPage } from './pages/skills'

function NotFound() {
	return (
		<div className="flex flex-col items-center justify-center h-screen bg-void">
			<span className="text-6xl font-display font-bold text-ghost mb-4">404</span>
			<p className="text-sm font-body text-chrome/60 mb-6">Page not found</p>
			<a
				href="/chat"
				className="px-5 py-2 bg-ghost text-void font-ui text-xs font-bold uppercase tracking-wider"
			>
				Go to Chat
			</a>
		</div>
	)
}

function ErrorFallback() {
	const error = useRouteError()
	const message = isRouteErrorResponse(error)
		? `${error.status}: ${error.statusText}`
		: error instanceof Error
			? error.message
			: 'An unexpected error occurred'

	return (
		<div className="flex flex-col items-center justify-center h-screen bg-void">
			<span className="text-2xl font-display font-bold text-pulse mb-4">Error</span>
			<p className="text-sm font-body text-chrome/60 mb-6 max-w-md text-center">{message}</p>
			<a
				href="/chat"
				className="px-5 py-2 bg-ghost text-void font-ui text-xs font-bold uppercase tracking-wider"
			>
				Go to Chat
			</a>
		</div>
	)
}

export const router = createBrowserRouter([
	{
		path: '/onboard',
		element: <OnboardPage />,
	},
	{
		element: <RootLayout />,
		errorElement: <ErrorFallback />,
		children: [
			{
				path: '/',
				element: <Navigate to="/chat" replace />,
			},
			{
				path: '/chat',
				element: <ChatPage />,
			},
			{
				path: '/chat/:id',
				element: <ChatPage />,
			},
			{
				path: '/activity',
				element: <ActivityPage />,
			},
			{
				path: '/costs',
				element: <CostsPage />,
			},
			{
				path: '/skills',
				element: <SkillsPage />,
			},
			{
				path: '/scheduler',
				element: <SchedulerPage />,
			},
			{
				path: '/canvas',
				element: <CanvasPage />,
			},
			{
				path: '/canvas/:id',
				element: <CanvasPage />,
			},
			{
				path: '/settings',
				element: <SettingsPage />,
			},
			{
				path: '*',
				element: <NotFound />,
			},
		],
	},
])
