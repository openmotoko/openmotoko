import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Conversation } from '../lib/api'
import { api } from '../lib/api'

export function useConversations() {
	return useQuery({
		queryKey: ['conversations'],
		queryFn: () => api.getConversations({ limit: 50 }),
	})
}

export function useConversation(id: string | undefined) {
	return useQuery({
		queryKey: ['conversation', id],
		queryFn: () => api.getConversation(id as string),
		enabled: !!id,
	})
}

export function useCreateConversation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: { title?: string; model?: string; systemPrompt?: string }) =>
			api.createConversation(data),
		onSuccess: (newConversation: Conversation) => {
			queryClient.setQueryData<Conversation[]>(['conversations'], (old) =>
				old ? [newConversation, ...old] : [newConversation],
			)
		},
	})
}

export function useSendMessage() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
			api.sendMessage(conversationId, content),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ['conversation', variables.conversationId],
			})
		},
	})
}
