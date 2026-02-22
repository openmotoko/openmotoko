import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { api } from '../../lib/api'

interface Props {
	onClose: () => void
}

export function WebhookCreateDialog({ onClose }: Props) {
	const queryClient = useQueryClient()
	const [name, setName] = useState('')
	const [conversationId, setConversationId] = useState('')

	const createMutation = useMutation({
		mutationFn: () =>
			api.createWebhook({
				name,
				targetConversationId: conversationId || undefined,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webhooks'] })
			onClose()
		},
	})

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault()
			if (!name.trim()) return
			createMutation.mutate()
		},
		[name, createMutation],
	)

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80">
			<div
				className="w-full max-w-md bg-shell border border-[var(--border-default)] cut-tr cut-border"
				style={{ '--cut-md': '12px' } as React.CSSProperties}
			>
				<div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)]">
					<h3 className="font-display font-semibold text-sm text-chrome">New Webhook</h3>
					<button
						type="button"
						onClick={onClose}
						className="text-static hover:text-chrome transition-colors"
					>
						<X size={16} />
					</button>
				</div>
				<form onSubmit={handleSubmit} className="p-5 space-y-4">
					<div className="space-y-1.5">
						<label
							htmlFor="wh-name"
							className="text-xs font-ui font-bold uppercase tracking-wider text-static block"
						>
							Name
						</label>
						<input
							id="wh-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="My Webhook"
							required
							className="w-full bg-void text-chrome font-body text-sm px-3 py-2.5 border border-[var(--border-default)] focus:border-ghost focus:shadow-[0_0_0_1px_var(--ghost-border)] outline-none transition-[border-color,box-shadow] placeholder:text-static"
						/>
					</div>
					<div className="space-y-1.5">
						<label
							htmlFor="wh-convo"
							className="text-xs font-ui font-bold uppercase tracking-wider text-static block"
						>
							Target Conversation ID (optional)
						</label>
						<input
							id="wh-convo"
							type="text"
							value={conversationId}
							onChange={(e) => setConversationId(e.target.value)}
							placeholder="Leave empty for no target"
							className="w-full bg-void text-chrome font-body text-sm px-3 py-2.5 border border-[var(--border-default)] focus:border-ghost focus:shadow-[0_0_0_1px_var(--ghost-border)] outline-none transition-[border-color,box-shadow] placeholder:text-static"
						/>
					</div>
					<div className="flex justify-end gap-3 pt-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-xs font-ui font-bold uppercase tracking-wider text-static hover:text-chrome border border-[var(--border-default)] transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={!name.trim() || createMutation.isPending}
							className="px-4 py-2 bg-ghost text-void text-xs font-ui font-bold uppercase tracking-wider cut-tr hover:bg-ghost-hover hover:drop-shadow-[0_0_10px_rgba(0,240,255,0.4)] transition-all disabled:opacity-50"
							style={{ '--cut-md': '8px' } as React.CSSProperties}
						>
							{createMutation.isPending ? 'Creating...' : 'Create'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}
