import { motion } from 'framer-motion'
import { Brain, Cloud, Cpu, Eye, EyeOff, Server } from 'lucide-react'
import { useState } from 'react'
import type { StepProps } from '../types'

const PROVIDERS = [
	{
		id: 'anthropic',
		name: 'Anthropic',
		icon: Brain,
		desc: 'Claude models, best for coding and reasoning',
	},
	{ id: 'openai', name: 'OpenAI', icon: Cpu, desc: 'GPT and o-series models, versatile and fast' },
	{ id: 'google', name: 'Google AI', icon: Cloud, desc: 'Gemini models, great multimodal support' },
	{ id: 'ollama', name: 'Ollama', icon: Server, desc: 'Run models locally, full privacy' },
] as const

export function ProviderStep({ data, onChange }: StepProps) {
	const [showKey, setShowKey] = useState(false)
	const isLocal = data.provider === 'ollama'

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-display font-bold text-lg text-chrome mb-1">
					Choose your LLM provider
				</h2>
				<p className="text-sm font-body text-chrome/60">
					Select where your AI models run. You can add more later in Settings.
				</p>
			</div>

			<div className="grid grid-cols-2 gap-3">
				{PROVIDERS.map((p) => {
					const active = data.provider === p.id
					return (
						<motion.button
							key={p.id}
							type="button"
							whileTap={{ scale: 0.97 }}
							onClick={() => onChange({ provider: p.id, apiKey: '', model: null })}
							className={`text-left p-4 border transition-all cut-tr cut-border ${
								active
									? 'bg-ghost-muted border-[var(--ghost-border)] shadow-[0_0_12px_rgba(0,240,255,0.15)]'
									: 'bg-shell border-[var(--border-default)] hover:border-static'
							}`}
							style={{ '--cut-md': '10px' } as React.CSSProperties}
						>
							<div className="flex items-center gap-3 mb-2">
								<div
									className={`w-8 h-8 flex items-center justify-center cut-hex ${active ? 'bg-ghost/20' : 'bg-void/50'}`}
								>
									<p.icon size={16} className={active ? 'text-ghost' : 'text-static'} />
								</div>
								<span
									className={`font-ui font-bold text-sm ${active ? 'text-ghost' : 'text-chrome'}`}
								>
									{p.name}
								</span>
							</div>
							<p className="text-xs font-body text-chrome/50 leading-relaxed">{p.desc}</p>
						</motion.button>
					)
				})}
			</div>

			{data.provider && (
				<motion.div
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					className="space-y-2"
				>
					<label
						htmlFor="provider-credential"
						className="text-xs font-ui font-bold uppercase tracking-wider text-static block"
					>
						{isLocal ? 'Ollama Host URL' : 'API Key'}
					</label>
					<div className="relative">
						<input
							id="provider-credential"
							type={isLocal || showKey ? 'text' : 'password'}
							value={isLocal ? data.ollamaHost : data.apiKey}
							onChange={(e) =>
								onChange(isLocal ? { ollamaHost: e.target.value } : { apiKey: e.target.value })
							}
							placeholder={
								isLocal
									? 'http://localhost:11434'
									: `Enter your ${PROVIDERS.find((pr) => pr.id === data.provider)?.name} API key`
							}
							className="w-full bg-void text-chrome font-body text-sm px-3 py-2.5 border border-[var(--border-default)] focus:border-ghost focus:shadow-[0_0_0_1px_var(--ghost-border)] outline-none transition-[border-color,box-shadow] placeholder:text-static"
						/>
						{!isLocal && (
							<button
								type="button"
								onClick={() => setShowKey(!showKey)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-static hover:text-chrome transition-colors"
							>
								{showKey ? <EyeOff size={14} /> : <Eye size={14} />}
							</button>
						)}
					</div>
				</motion.div>
			)}
		</div>
	)
}
