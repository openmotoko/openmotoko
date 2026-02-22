import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useConversations, useCreateConversation } from '../../hooks/use-conversations'
import { useStore } from '../../lib/store'

function formatTimestamp(ts: number): string {
	const date = new Date(ts)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffMins = Math.floor(diffMs / 60000)
	const diffHours = Math.floor(diffMs / 3600000)
	const diffDays = Math.floor(diffMs / 86400000)

	if (diffMins < 1) return 'now'
	if (diffMins < 60) return `${diffMins}m`
	if (diffHours < 24) return `${diffHours}h`
	if (diffDays < 7) return `${diffDays}d`
	return date.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

export function ConversationList() {
	const { data: conversations, isLoading } = useConversations()
	const createConversation = useCreateConversation()
	const activeConversationId = useStore((s) => s.activeConversationId)
	const navigate = useNavigate()

	const handleNewConversation = async () => {
		const conversation = await createConversation.mutateAsync({})
		navigate(`/chat/${conversation.id}`)
	}

	return (
		<div className="flex flex-col flex-1 min-h-0">
			<div className="flex items-center justify-between px-4 py-3">
				<span className="text-xs font-ui font-bold text-static uppercase tracking-wider">
					Conversations
				</span>
				<button
					type="button"
					onClick={handleNewConversation}
					disabled={createConversation.isPending}
					className="flex items-center justify-center w-6 h-6 text-static hover:text-ghost transition-colors cut-tr"
					style={{ '--cut-md': '4px' } as React.CSSProperties}
					aria-label="New conversation"
				>
					<Plus size={14} />
				</button>
			</div>

			<div className="flex-1 overflow-y-auto px-2">
				{isLoading && (
					<div className="px-2 py-4">
						{['s0', 's1', 's2', 's3', 's4'].map((id) => (
							<div key={id} className="h-14 mb-1 bg-[rgba(74,96,112,0.06)] animate-pulse rounded" />
						))}
					</div>
				)}

				{conversations?.map((conv) => {
					const isActive = conv.id === activeConversationId

					return (
						<button
							key={conv.id}
							type="button"
							onClick={() => navigate(`/chat/${conv.id}`)}
							className={`
								w-full text-left px-3 py-2.5 mb-0.5 transition-all group
								${
									isActive
										? 'bg-ghost-muted text-chrome'
										: 'text-static hover:text-chrome hover:bg-[rgba(74,96,112,0.08)]'
								}
							`}
						>
							<div className="flex items-center justify-between gap-2">
								<span className="text-sm font-body truncate flex-1">
									{conv.title || 'New Conversation'}
								</span>
								<span className="text-xs font-ui text-static flex-shrink-0">
									{formatTimestamp(conv.updatedAt)}
								</span>
							</div>
							{conv.model && (
								<span className="text-xs font-code text-static/60 mt-0.5 block truncate">
									{conv.model}
								</span>
							)}
						</button>
					)
				})}

				{!isLoading && conversations?.length === 0 && (
					<div className="px-3 py-8 text-center">
						<p className="text-xs font-ui text-static">No conversations yet</p>
					</div>
				)}
			</div>
		</div>
	)
}
