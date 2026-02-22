import { motion } from 'framer-motion'
import { Bot, SlidersHorizontal } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router'
import { InputBar } from '../components/chat/input-bar'
import { MessageBubble } from '../components/chat/message-bubble'
import { ContextPanel } from '../components/context/context-panel'
import { useConversation, useCreateConversation, useSendMessage } from '../hooks/use-conversations'
import type { Message } from '../lib/api'
import { useStore } from '../lib/store'

function StreamingBubble({
	content,
	toolCalls,
}: {
	content: string | null
	toolCalls: { id: string; name: string; status: string; duration: number | null }[]
}) {
	if (!content && toolCalls.length === 0) return null

	return (
		<div className="flex justify-start mb-4">
			<div
				className="max-w-[80%] px-4 py-3 bg-shell text-chrome cut-bl cut-border"
				style={{ '--cut-md': '10px' } as React.CSSProperties}
			>
				<div className="flex items-center gap-2 mb-1">
					<span className="text-xs font-ui font-bold uppercase tracking-wider text-static">
						Agent
					</span>
				</div>

				{content && (
					<p className="text-sm font-body leading-relaxed whitespace-pre-wrap">
						{content}
						<span
							className="inline-block w-[0.6em] h-[1.1em] bg-ghost align-text-bottom ml-0.5"
							style={{ animation: 'cursor-blink 1s step-end infinite' }}
						/>
					</p>
				)}

				{toolCalls.length > 0 && (
					<div className="mt-2 space-y-1 border-l-2 border-[var(--ghost-border)] pl-3">
						{toolCalls.map((tc) => (
							<div key={tc.id} className="flex items-center gap-2 py-1">
								<div
									className={`w-2 h-2 rounded-full ${
										tc.status === 'success'
											? 'bg-alive'
											: tc.status === 'error'
												? 'bg-pulse'
												: 'bg-edge animate-pulse'
									}`}
								/>
								<span className="text-xs font-ui font-bold text-chrome">{tc.name}</span>
								{tc.duration != null && (
									<span className="text-xs font-code text-static ml-auto">{tc.duration}ms</span>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}

function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center h-full px-8">
			<div className="w-16 h-16 bg-ghost-muted flex items-center justify-center cut-hex mb-6">
				<Bot size={28} className="text-ghost" />
			</div>
			<h2 className="font-display font-bold text-xl text-chrome mb-2">OpenMotoko</h2>
			<p className="font-body text-sm text-static text-center max-w-md">
				Personal AI agent ready to assist. Send a message to start a new conversation.
			</p>
			<div className="flex gap-3 mt-6">
				{['Run a shell command', 'Search the web', 'Read a file'].map((suggestion) => (
					<button
						key={suggestion}
						type="button"
						className="px-3 py-2 text-xs font-ui text-static border border-[var(--border-default)] hover:border-[var(--ghost-border)] hover:text-ghost transition-all cut-tr"
						style={{ '--cut-md': '6px' } as React.CSSProperties}
					>
						{suggestion}
					</button>
				))}
			</div>
		</div>
	)
}

export function ChatPage() {
	const { id } = useParams()
	const navigate = useNavigate()
	const { data: conversation } = useConversation(id)
	const sendMessage = useSendMessage()
	const createConversation = useCreateConversation()
	const {
		streamingContent,
		streamingToolCalls,
		isAgentThinking,
		setActiveConversation,
		contextPanelOpen,
		toggleContextPanel,
	} = useStore()
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const scrollContainerRef = useRef<HTMLDivElement>(null)

	const messages: Message[] = conversation?.messages ?? []

	useEffect(() => {
		setActiveConversation(id ?? null)
		return () => setActiveConversation(null)
	}, [id, setActiveConversation])

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [])

	const handleSend = useCallback(
		async (content: string) => {
			let conversationId = id

			if (!conversationId) {
				const newConv = await createConversation.mutateAsync({
					title: content.slice(0, 60),
				})
				conversationId = newConv.id
				navigate(`/chat/${conversationId}`, { replace: true })
			}

			sendMessage.mutate({ conversationId, content })
		},
		[id, navigate, sendMessage, createConversation],
	)

	if (!id) {
		return (
			<div className="flex flex-col h-full">
				<EmptyState />
				<InputBar onSend={handleSend} disabled={isAgentThinking} />
			</div>
		)
	}

	return (
		<div className="flex h-full">
			<div className="flex flex-col flex-1 min-w-0">
				{conversation && (
					<div className="flex items-center gap-3 px-6 py-3 border-b border-(--border-default) bg-shell/30 backdrop-blur-sm shrink-0">
						<h1 className="font-display font-semibold text-sm text-chrome truncate flex-1">
							{conversation.title || 'New Conversation'}
						</h1>
						{conversation.model && (
							<span className="text-xs font-code text-ghost/70 cut-chevron bg-ghost-muted px-3 py-0.5 shrink-0">
								{conversation.model}
							</span>
						)}
						<button
							type="button"
							onClick={toggleContextPanel}
							className={`w-7 h-7 flex items-center justify-center shrink-0 transition-colors cut-tr ${
								contextPanelOpen ? 'bg-ghost-muted text-ghost' : 'text-static hover:text-chrome'
							}`}
							style={{ '--cut-md': '4px' } as React.CSSProperties}
							aria-label="Toggle context panel"
						>
							<SlidersHorizontal size={14} />
						</button>
					</div>
				)}

				<div
					ref={scrollContainerRef}
					className="flex-1 overflow-y-auto px-6 py-4"
					aria-live="polite"
				>
					{messages.length === 0 && !streamingContent && <EmptyState />}

					{messages.map((msg) => (
						<motion.div
							key={msg.id}
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.2 }}
						>
							<MessageBubble message={msg} />
						</motion.div>
					))}

					<StreamingBubble content={streamingContent} toolCalls={streamingToolCalls} />

					<div ref={messagesEndRef} />
				</div>

				<InputBar onSend={handleSend} disabled={isAgentThinking} />
			</div>

			{conversation && <ContextPanel conversation={conversation} />}
		</div>
	)
}
