import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Plus, Power, Trash2, Webhook } from 'lucide-react'
import { useState } from 'react'
import type { WebhookItem } from '../../lib/api'
import { api } from '../../lib/api'
import { WebhookCreateDialog } from './webhook-create-dialog'

function WebhookCard({ webhook }: { webhook: WebhookItem }) {
	const queryClient = useQueryClient()
	const [copied, setCopied] = useState(false)

	const toggleMutation = useMutation({
		mutationFn: () => api.toggleWebhook(webhook.id),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
	})

	const deleteMutation = useMutation({
		mutationFn: () => api.deleteWebhook(webhook.id),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
	})

	const copySecret = async () => {
		await navigator.clipboard.writeText(webhook.secret)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<div className="flex items-center gap-3 px-4 py-3 border border-[var(--border-default)] bg-void/30">
			<Webhook size={16} className={webhook.enabled ? 'text-ghost' : 'text-static'} />
			<div className="flex-1 min-w-0">
				<span className="text-sm font-ui font-medium text-chrome block truncate">
					{webhook.name}
				</span>
				<span className="text-xs font-ui text-static">
					{webhook.handler}{' '}
					{webhook.lastTriggeredAt
						? `| last: ${new Date(webhook.lastTriggeredAt).toLocaleDateString()}`
						: ''}
				</span>
			</div>
			<button
				type="button"
				onClick={copySecret}
				title="Copy secret"
				className="p-1.5 text-static hover:text-chrome transition-colors"
			>
				<Copy size={14} />
				{copied && <span className="absolute text-xs text-alive -mt-6 -ml-2">Copied</span>}
			</button>
			<button
				type="button"
				onClick={() => toggleMutation.mutate()}
				title={webhook.enabled ? 'Disable' : 'Enable'}
				className={`p-1.5 transition-colors ${webhook.enabled ? 'text-alive hover:text-chrome' : 'text-static hover:text-chrome'}`}
			>
				<Power size={14} />
			</button>
			<button
				type="button"
				onClick={() => deleteMutation.mutate()}
				title="Delete"
				className="p-1.5 text-static hover:text-danger transition-colors"
			>
				<Trash2 size={14} />
			</button>
		</div>
	)
}

export function WebhookList() {
	const [showCreate, setShowCreate] = useState(false)

	const { data: webhooks } = useQuery({
		queryKey: ['webhooks'],
		queryFn: () => api.getWebhooks(),
	})

	return (
		<>
			<div className="flex items-center justify-between mb-3">
				<span className="text-xs font-ui text-static uppercase tracking-wider">
					{webhooks?.length ?? 0} webhook{webhooks?.length === 1 ? '' : 's'}
				</span>
				<button
					type="button"
					onClick={() => setShowCreate(true)}
					className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-ui font-bold uppercase tracking-wider text-ghost border border-ghost/30 hover:bg-ghost/10 transition-colors"
				>
					<Plus size={12} />
					Add
				</button>
			</div>
			{webhooks && webhooks.length > 0 ? (
				<div className="space-y-2">
					{webhooks.map((wh) => (
						<WebhookCard key={wh.id} webhook={wh} />
					))}
				</div>
			) : (
				<div className="py-6 text-center">
					<p className="text-xs font-ui text-static">No webhooks configured</p>
				</div>
			)}
			{showCreate && <WebhookCreateDialog onClose={() => setShowCreate(false)} />}
		</>
	)
}
