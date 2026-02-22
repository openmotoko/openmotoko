import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, Minimize2, Trash2, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { ConversationWithMessages, Message } from '../../lib/api'
import { api } from '../../lib/api'
import { useStore } from '../../lib/store'
import { ConversationStats } from './conversation-stats'
import { ModelSwitcher } from './model-switcher'
import { PromptEditor } from './prompt-editor'
import { SkillToggles } from './skill-toggles'

interface ContextPanelProps {
	conversation: ConversationWithMessages
}

function SectionLabel({ text }: { text: string }) {
	return (
		<h3 className="text-[10px] font-ui font-bold uppercase tracking-widest text-static mb-2">
			{text}
		</h3>
	)
}

function ActionButton({
	icon: Icon,
	label,
	variant = 'default',
	onClick,
}: {
	icon: typeof X
	label: string
	variant?: 'default' | 'danger'
	onClick: () => void
}) {
	const colors =
		variant === 'danger'
			? 'text-pulse hover:bg-pulse-muted'
			: 'text-static hover:text-chrome hover:bg-[rgba(74,96,112,0.1)]'

	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs font-ui transition-colors ${colors}`}
		>
			<Icon size={13} />
			<span>{label}</span>
		</button>
	)
}

export function ContextPanel({ conversation }: ContextPanelProps) {
	const { contextPanelOpen, setContextPanelOpen } = useStore()
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const [enabledSkills, setEnabledSkills] = useState<Set<string>>(new Set())

	const updateConversation = useMutation({
		mutationFn: (data: { model?: string; systemPrompt?: string }) =>
			api.updateConversation(conversation.id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['conversation', conversation.id] })
		},
	})

	const deleteConversation = useMutation({
		mutationFn: () => api.deleteConversation(conversation.id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['conversations'] })
			setContextPanelOpen(false)
			navigate('/chat')
		},
	})

	const compactConversation = useMutation({
		mutationFn: () => api.compactConversation(conversation.id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['conversation', conversation.id] })
		},
	})

	const handleExport = useCallback(async () => {
		const data = await api.exportConversation(conversation.id)
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `${conversation.title || 'conversation'}.json`
		a.click()
		URL.revokeObjectURL(url)
	}, [conversation.id, conversation.title])

	const handleSkillToggle = useCallback((skillId: string) => {
		setEnabledSkills((prev) => {
			const next = new Set(prev)
			if (next.has(skillId)) next.delete(skillId)
			else next.add(skillId)
			return next
		})
	}, [])

	const stats = useMemo(() => {
		const msgs: Message[] = conversation.messages ?? []
		return {
			tokens: msgs.reduce((sum, m) => sum + (m.tokens ?? 0), 0),
			cost: msgs.reduce((sum, m) => sum + (m.cost ?? 0), 0),
			messageCount: msgs.length,
		}
	}, [conversation.messages])

	return (
		<AnimatePresence>
			{contextPanelOpen && (
				<motion.div
					initial={{ width: 0, opacity: 0 }}
					animate={{ width: 380, opacity: 1 }}
					exit={{ width: 0, opacity: 0 }}
					transition={{ type: 'spring', damping: 28, stiffness: 300 }}
					className="h-full bg-shell border-l border-(--ghost-border) shrink-0 overflow-hidden"
				>
					<div className="w-[380px] h-full flex flex-col">
						<div className="flex items-center justify-between px-4 py-3 border-b border-(--border-default)">
							<h2 className="text-xs font-display font-bold uppercase tracking-wider text-chrome">
								Context
							</h2>
							<button
								type="button"
								onClick={() => setContextPanelOpen(false)}
								className="w-6 h-6 flex items-center justify-center text-static hover:text-chrome transition-colors"
							>
								<X size={14} />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
							<section>
								<SectionLabel text="Model" />
								<ModelSwitcher
									currentModel={conversation.model || 'balanced'}
									onSelect={(model) => updateConversation.mutate({ model })}
								/>
							</section>

							<section>
								<SectionLabel text="System Prompt" />
								<PromptEditor
									value={conversation.systemPrompt ?? ''}
									onSave={(systemPrompt) => updateConversation.mutate({ systemPrompt })}
								/>
							</section>

							<section>
								<SectionLabel text="Skills" />
								<SkillToggles enabledSkills={enabledSkills} onToggle={handleSkillToggle} />
							</section>

							<section>
								<SectionLabel text="Stats" />
								<ConversationStats
									tokens={stats.tokens}
									cost={stats.cost}
									messageCount={stats.messageCount}
									createdAt={conversation.createdAt}
									updatedAt={conversation.updatedAt}
								/>
							</section>

							<section>
								<SectionLabel text="Actions" />
								<div className="space-y-0.5">
									<ActionButton
										icon={Minimize2}
										label="Compact context"
										onClick={() => compactConversation.mutate()}
									/>
									<ActionButton
										icon={Download}
										label="Export conversation"
										onClick={handleExport}
									/>
									<ActionButton
										icon={Trash2}
										label="Delete conversation"
										variant="danger"
										onClick={() => deleteConversation.mutate()}
									/>
								</div>
							</section>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
