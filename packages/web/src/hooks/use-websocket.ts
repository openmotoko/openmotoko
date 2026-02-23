import { useEffect, useSyncExternalStore } from 'react'
import { useStore } from '../lib/store'
import type { AgentEvent } from '../lib/ws'
import { wsClient } from '../lib/ws'

function subscribe(callback: () => void) {
	return wsClient.onEvent(() => callback())
}

function getSnapshot() {
	return wsClient.isConnected
}

export function useWebSocket() {
	const {
		onboardingComplete,
		addMessage,
		updateStreamingContent,
		clearStreaming,
		addStreamingToolCall,
		updateStreamingToolCall,
		setIsAgentThinking,
		addActivityItem,
		setWsConnected,
		setCostToday,
	} = useStore()

	const isConnected = useSyncExternalStore(subscribe, getSnapshot)

	useEffect(() => {
		setWsConnected(isConnected)
	}, [isConnected, setWsConnected])

	useEffect(() => {
		if (!onboardingComplete) return

		wsClient.connect()

		const unsubscribe = wsClient.onEvent((event: AgentEvent) => {
			switch (event.type) {
				case 'message:received':
					setIsAgentThinking(true)
					break

				case 'message:sent':
					addMessage(event.conversationId, event.message)
					clearStreaming()
					break

				case 'llm:stream':
					updateStreamingContent(event.chunk)
					break

				case 'llm:complete':
					clearStreaming()
					break

				case 'tool:called':
					addStreamingToolCall({
						id: `${event.tool}-${Date.now()}`,
						name: event.tool,
						input: event.input,
						output: null,
						duration: null,
						status: 'running',
					})
					break

				case 'tool:result': {
					const store = useStore.getState()
					const runningCall = store.streamingToolCalls.find(
						(tc) => tc.name === event.tool && tc.status === 'running',
					)
					if (runningCall) {
						updateStreamingToolCall(runningCall.id, {
							output: event.output,
							duration: event.duration,
							status: event.status,
						})
					}
					break
				}

				case 'cost:updated':
					setCostToday(event.totalToday)
					break

				case 'skill:activated':
				case 'channel:message':
					addActivityItem({
						id: `${event.type}-${Date.now()}`,
						type: event.type,
						conversationId: null,
						channel: event.type === 'channel:message' ? event.channel : null,
						skillId: event.type === 'skill:activated' ? event.skillId : null,
						data: event,
						createdAt: Date.now(),
					})
					break
			}
		})

		return () => {
			unsubscribe()
			wsClient.disconnect()
		}
	}, [
		onboardingComplete,
		addMessage,
		updateStreamingContent,
		clearStreaming,
		addStreamingToolCall,
		updateStreamingToolCall,
		setIsAgentThinking,
		addActivityItem,
		setCostToday,
	])

	return { isConnected }
}
