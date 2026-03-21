import { create } from 'zustand'
import type { ActivityItem, Conversation, Message, SecurityDashboard } from './api'

interface StreamingToolCall {
	id: string
	name: string
	input: unknown
	output: unknown | null
	duration: number | null
	status: 'pending' | 'running' | 'success' | 'error'
}

interface AppState {
	conversations: Conversation[]
	activeConversationId: string | null
	messages: Record<string, Message[]>
	streamingContent: string | null
	streamingToolCalls: StreamingToolCall[]
	isAgentThinking: boolean

	activityFeed: ActivityItem[]
	activityFilters: {
		channel: string | null
		skillId: string | null
		type: string | null
	}

	sidebarOpen: boolean
	contextPanelOpen: boolean
	activePage: string

	onboardingComplete: boolean

	wsConnected: boolean
	costToday: number

	securityDashboard: SecurityDashboard | null
	setSecurityDashboard: (dashboard: SecurityDashboard) => void

	setConversations: (conversations: Conversation[]) => void
	setActiveConversation: (id: string | null) => void
	setMessages: (conversationId: string, messages: Message[]) => void
	addMessage: (conversationId: string, message: Message) => void
	updateStreamingContent: (content: string) => void
	clearStreaming: () => void
	addStreamingToolCall: (toolCall: StreamingToolCall) => void
	updateStreamingToolCall: (id: string, update: Partial<StreamingToolCall>) => void
	setIsAgentThinking: (thinking: boolean) => void

	addActivityItem: (item: ActivityItem) => void
	setActivityFeed: (items: ActivityItem[]) => void
	setActivityFilters: (filters: Partial<AppState['activityFilters']>) => void

	setSidebarOpen: (open: boolean) => void
	toggleSidebar: () => void
	setContextPanelOpen: (open: boolean) => void
	toggleContextPanel: () => void
	setActivePage: (page: string) => void

	setOnboardingComplete: (complete: boolean) => void

	setWsConnected: (connected: boolean) => void
	setCostToday: (cost: number) => void
}

export const useStore = create<AppState>((set) => ({
	conversations: [],
	activeConversationId: null,
	messages: {},
	streamingContent: null,
	streamingToolCalls: [],
	isAgentThinking: false,

	activityFeed: [],
	activityFilters: {
		channel: null,
		skillId: null,
		type: null,
	},

	sidebarOpen: true,
	contextPanelOpen: false,
	activePage: 'chat',

	onboardingComplete: localStorage.getItem('openmotoko-onboarding') === 'done',

	wsConnected: false,
	costToday: 0,

	securityDashboard: null,
	setSecurityDashboard: (dashboard) => set({ securityDashboard: dashboard }),

	setConversations: (conversations) => set({ conversations }),

	setActiveConversation: (id) => set({ activeConversationId: id }),

	setMessages: (conversationId, messages) =>
		set((state) => ({
			messages: { ...state.messages, [conversationId]: messages },
		})),

	addMessage: (conversationId, message) =>
		set((state) => ({
			messages: {
				...state.messages,
				[conversationId]: [...(state.messages[conversationId] ?? []), message],
			},
		})),

	updateStreamingContent: (content) =>
		set((state) => ({
			streamingContent: (state.streamingContent ?? '') + content,
		})),

	clearStreaming: () =>
		set({
			streamingContent: null,
			streamingToolCalls: [],
			isAgentThinking: false,
		}),

	addStreamingToolCall: (toolCall) =>
		set((state) => ({
			streamingToolCalls: [...state.streamingToolCalls, toolCall],
		})),

	updateStreamingToolCall: (id, update) =>
		set((state) => ({
			streamingToolCalls: state.streamingToolCalls.map((tc) =>
				tc.id === id ? { ...tc, ...update } : tc,
			),
		})),

	setIsAgentThinking: (thinking) => set({ isAgentThinking: thinking }),

	addActivityItem: (item) =>
		set((state) => ({
			activityFeed: [item, ...state.activityFeed].slice(0, 200),
		})),

	setActivityFeed: (items) => set({ activityFeed: items }),

	setActivityFilters: (filters) =>
		set((state) => ({
			activityFilters: { ...state.activityFilters, ...filters },
		})),

	setSidebarOpen: (open) => set({ sidebarOpen: open }),

	toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

	setContextPanelOpen: (open) => set({ contextPanelOpen: open }),

	toggleContextPanel: () => set((state) => ({ contextPanelOpen: !state.contextPanelOpen })),

	setActivePage: (page) => set({ activePage: page }),

	setOnboardingComplete: (complete) => {
		localStorage.setItem('openmotoko-onboarding', complete ? 'done' : '')
		set({ onboardingComplete: complete })
	},

	setWsConnected: (connected) => set({ wsConnected: connected }),

	setCostToday: (cost) => set({ costToday: cost }),
}))
