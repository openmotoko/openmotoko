import { createBrowserRouter, Navigate } from 'react-router'
import { RootLayout } from './layouts/root-layout'
import { ActivityPage } from './pages/activity'
import { ChatPage } from './pages/chat'
import { SettingsPage } from './pages/settings'
import { SkillsPage } from './pages/skills'

export const router = createBrowserRouter([
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
				path: '/skills',
				element: <SkillsPage />,
			},
			{
				path: '/settings',
				element: <SettingsPage />,
			},
		],
	},
])
