import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Hash, Save, Send, Settings, Wifi } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { Channel, Settings as SettingsType } from '../lib/api'
import { api } from '../lib/api'

function SettingsInput({
	label,
	value,
	onChange,
	type = 'text',
	placeholder,
}: {
	label: string
	value: string
	onChange: (value: string) => void
	type?: 'text' | 'password' | 'number'
	placeholder?: string
}) {
	const [showPassword, setShowPassword] = useState(false)
	const inputType = type === 'password' && showPassword ? 'text' : type
	const inputId = `setting-${label.replace(/\s+/g, '-').toLowerCase()}`

	return (
		<div className="space-y-1.5">
			<label
				htmlFor={inputId}
				className="text-xs font-ui font-bold uppercase tracking-wider text-static block"
			>
				{label}
			</label>
			<div className="relative">
				<input
					id={inputId}
					type={inputType}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					className="w-full bg-void text-chrome font-body text-sm px-3 py-2.5 border border-[var(--border-default)] focus:border-ghost focus:shadow-[0_0_0_1px_var(--ghost-border)] outline-none transition-[border-color,box-shadow] placeholder:text-static"
				/>
				{type === 'password' && (
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-static hover:text-chrome transition-colors"
					>
						{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
					</button>
				)}
			</div>
		</div>
	)
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div
			className="bg-shell border border-[var(--border-default)] cut-tr cut-border"
			style={{ '--cut-md': '12px' } as React.CSSProperties}
		>
			<div className="px-5 py-3 border-b border-[var(--border-default)] cut-notch scanlines">
				<h2 className="font-display font-semibold text-sm text-chrome relative z-10">{title}</h2>
			</div>
			<div className="p-5 space-y-4">{children}</div>
		</div>
	)
}

function ChannelCard({ channel }: { channel: Channel }) {
	const channelIcons: Record<string, typeof Send> = {
		telegram: Send,
		whatsapp: Hash,
		discord: Hash,
		slack: Hash,
		signal: Wifi,
		imessage: Send,
	}
	const Icon = channelIcons[channel.type] ?? Wifi

	return (
		<div className="flex items-center gap-3 px-4 py-3 border border-[var(--border-default)] bg-void/30">
			<Icon size={16} className={channel.enabled ? 'text-ghost' : 'text-static'} />
			<div className="flex-1 min-w-0">
				<span className="text-sm font-ui font-medium text-chrome capitalize">{channel.type}</span>
			</div>
			<div className={`w-2 h-2 rounded-full ${channel.enabled ? 'bg-alive' : 'bg-static'}`} />
			<span className="text-xs font-ui text-static">{channel.enabled ? 'Active' : 'Inactive'}</span>
		</div>
	)
}

export function SettingsPage() {
	const queryClient = useQueryClient()

	const { data: settings } = useQuery({
		queryKey: ['settings'],
		queryFn: () => api.getSettings(),
	})

	const { data: channels } = useQuery({
		queryKey: ['channels'],
		queryFn: () => api.getChannels(),
	})

	const updateSettings = useMutation({
		mutationFn: (data: SettingsType) => api.updateSettings(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['settings'] })
		},
	})

	const [formValues, setFormValues] = useState<Record<string, string>>({})
	const [isDirty, setIsDirty] = useState(false)

	useEffect(() => {
		if (settings) {
			setFormValues({
				anthropicApiKey: (settings.anthropicApiKey as string) ?? '',
				openaiApiKey: (settings.openaiApiKey as string) ?? '',
				googleAiApiKey: (settings.googleAiApiKey as string) ?? '',
				ollamaHost: (settings.ollamaHost as string) ?? 'http://localhost:11434',
				defaultModel: (settings.defaultModel as string) ?? '',
				port: String((settings.port as number) ?? 3457),
				host: (settings.host as string) ?? '0.0.0.0',
			})
			setIsDirty(false)
		}
	}, [settings])

	const handleChange = useCallback((key: string, value: string) => {
		setFormValues((prev) => ({ ...prev, [key]: value }))
		setIsDirty(true)
	}, [])

	const handleSave = useCallback(() => {
		updateSettings.mutate(formValues)
		setIsDirty(false)
	}, [formValues, updateSettings])

	return (
		<div className="h-full overflow-y-auto">
			<div className="max-w-3xl mx-auto px-6 py-6">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-3">
						<Settings size={20} className="text-ghost" />
						<h1 className="font-display font-bold text-xl text-chrome">Settings</h1>
					</div>
					{isDirty && (
						<motion.button
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							type="button"
							onClick={handleSave}
							disabled={updateSettings.isPending}
							className="flex items-center gap-2 px-4 py-2 bg-ghost text-void font-ui text-xs font-bold uppercase tracking-wider cut-tr hover:bg-ghost-hover hover:drop-shadow-[0_0_10px_rgba(0,240,255,0.4)] transition-all disabled:opacity-50"
							style={{ '--cut-md': '8px' } as React.CSSProperties}
						>
							<Save size={12} />
							{updateSettings.isPending ? 'Saving...' : 'Save'}
						</motion.button>
					)}
				</div>

				<div className="space-y-6">
					<SettingsSection title="LLM Providers">
						<SettingsInput
							label="Anthropic API Key"
							value={formValues.anthropicApiKey ?? ''}
							onChange={(v) => handleChange('anthropicApiKey', v)}
							type="password"
							placeholder="sk-ant-..."
						/>
						<SettingsInput
							label="OpenAI API Key"
							value={formValues.openaiApiKey ?? ''}
							onChange={(v) => handleChange('openaiApiKey', v)}
							type="password"
							placeholder="sk-..."
						/>
						<SettingsInput
							label="Google AI API Key"
							value={formValues.googleAiApiKey ?? ''}
							onChange={(v) => handleChange('googleAiApiKey', v)}
							type="password"
							placeholder="AIza..."
						/>
						<SettingsInput
							label="Ollama Host"
							value={formValues.ollamaHost ?? ''}
							onChange={(v) => handleChange('ollamaHost', v)}
							placeholder="http://localhost:11434"
						/>
						<SettingsInput
							label="Default Model"
							value={formValues.defaultModel ?? ''}
							onChange={(v) => handleChange('defaultModel', v)}
							placeholder="claude-4-sonnet-20260514"
						/>
					</SettingsSection>

					<SettingsSection title="Application">
						<div className="grid grid-cols-2 gap-4">
							<SettingsInput
								label="Port"
								value={formValues.port ?? ''}
								onChange={(v) => handleChange('port', v)}
								type="number"
								placeholder="3457"
							/>
							<SettingsInput
								label="Host"
								value={formValues.host ?? ''}
								onChange={(v) => handleChange('host', v)}
								placeholder="0.0.0.0"
							/>
						</div>
					</SettingsSection>

					<SettingsSection title="Channels">
						{channels && channels.length > 0 ? (
							<div className="space-y-2">
								{channels.map((channel) => (
									<ChannelCard key={channel.id} channel={channel} />
								))}
							</div>
						) : (
							<div className="py-6 text-center">
								<p className="text-xs font-ui text-static">No channels configured</p>
							</div>
						)}
					</SettingsSection>
				</div>
			</div>
		</div>
	)
}
