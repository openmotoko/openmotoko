import { createBrowserRouter, Navigate } from 'react-router'
import { RootLayout } from './layouts/root-layout'
import { ActivityPage } from './pages/activity'
import { ChatPage } from './pages/chat'
import { CostsPage } from './pages/costs'
import { OnboardPage } from './pages/onboard'
import { SchedulerPage } from './pages/scheduler'
import { SettingsPage } from './pages/settings'
import { SkillsPage } from './pages/skills'

export const router = createBrowserRouter([
	{
		path: '/onboard',
		element: <OnboardPage />,
	},
	{
		element: <RootLayout />,
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
				path: '/settings',
				element: <SettingsPage />,
			},
		],
	},
])
