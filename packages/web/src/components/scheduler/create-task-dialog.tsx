import * as Dialog from '@radix-ui/react-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../lib/api'

const INITIAL = { name: '', description: '', cron: '*/5 * * * *', handler: '', maxRetries: 3 }

export function CreateTaskDialog() {
	const queryClient = useQueryClient()
	const [open, setOpen] = useState(false)
	const [form, setForm] = useState(INITIAL)

	const mutation = useMutation({
		mutationFn: () =>
			api.createSchedulerTask({
				...form,
				maxRetries: form.maxRetries,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['scheduler-tasks'] })
			setForm(INITIAL)
			setOpen(false)
		},
	})

	const set = (key: keyof typeof form, value: string | number) =>
		setForm((prev) => ({ ...prev, [key]: value }))

	const canSubmit = form.name.trim() && form.cron.trim() && form.handler.trim()

	return (
		<Dialog.Root open={open} onOpenChange={setOpen}>
			<Dialog.Trigger asChild>
				<button
					type="button"
					className="flex items-center gap-2 px-4 py-2 bg-ghost text-void font-ui text-xs font-bold uppercase tracking-wider cut-tr hover:bg-ghost-hover hover:drop-shadow-[0_0_10px_rgba(0,240,255,0.4)] transition-all"
					style={{ '--cut-md': '8px' } as React.CSSProperties}
				>
					<Plus size={14} />
					New Task
				</button>
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-void/70 backdrop-blur-sm z-50" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-shell border border-[var(--border-default)] cut-tr cut-border p-6 z-50 space-y-4">
					<div className="flex items-center justify-between">
						<Dialog.Title className="font-display font-bold text-sm text-chrome">
							Create Scheduled Task
						</Dialog.Title>
						<Dialog.Close asChild>
							<button type="button" className="text-static hover:text-chrome transition-colors">
								<X size={16} />
							</button>
						</Dialog.Close>
					</div>
					<FormField label="Name" value={form.name} onChange={(v) => set('name', v)} />
					<FormField
						label="Description"
						value={form.description}
						onChange={(v) => set('description', v)}
					/>
					<FormField
						label="Cron Expression"
						value={form.cron}
						onChange={(v) => set('cron', v)}
						placeholder="*/5 * * * *"
					/>
					<FormField
						label="Handler"
						value={form.handler}
						onChange={(v) => set('handler', v)}
						placeholder="heartbeat"
					/>
					<FormField
						label="Max Retries"
						value={String(form.maxRetries)}
						onChange={(v) => set('maxRetries', parseInt(v, 10) || 0)}
						type="number"
					/>
					<button
						type="button"
						onClick={() => mutation.mutate()}
						disabled={!canSubmit || mutation.isPending}
						className="w-full py-2.5 bg-ghost text-void font-ui text-xs font-bold uppercase tracking-wider cut-tr hover:bg-ghost-hover transition-all disabled:opacity-40"
						style={{ '--cut-md': '8px' } as React.CSSProperties}
					>
						{mutation.isPending ? 'Creating...' : 'Create Task'}
					</button>
					{mutation.isError && (
						<p className="text-xs font-code text-edge">{(mutation.error as Error).message}</p>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}

function FormField({
	label,
	value,
	onChange,
	placeholder,
	type = 'text',
}: {
	label: string
	value: string
	onChange: (v: string) => void
	placeholder?: string
	type?: string
}) {
	const inputId = `task-field-${label.replace(/\s+/g, '-').toLowerCase()}`
	return (
		<div className="space-y-1.5">
			<label
				htmlFor={inputId}
				className="text-xs font-ui font-bold uppercase tracking-wider text-static block"
			>
				{label}
			</label>
			<input
				id={inputId}
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className="w-full bg-void text-chrome font-body text-sm px-3 py-2.5 border border-[var(--border-default)] focus:border-ghost focus:shadow-[0_0_0_1px_var(--ghost-border)] outline-none transition-[border-color,box-shadow]"
			/>
		</div>
	)
}
