import { motion } from 'framer-motion'
import { Gauge, Sparkles, Zap } from 'lucide-react'
import type { StepProps } from '../types'

interface ModelOption {
	id: string
	name: string
	tag: string
	tagIcon: typeof Zap
	tagColor: string
	desc: string
	speed: number
	quality: number
}

const MODELS: Record<string, ModelOption[]> = {
	anthropic: [
		{
			id: 'claude-4-haiku-20260514',
			name: 'Claude 4 Haiku',
			tag: 'Fast',
			tagIcon: Zap,
			tagColor: 'text-alive',
			desc: 'Lightning fast, great for simple tasks',
			speed: 5,
			quality: 3,
		},
		{
			id: 'claude-4-sonnet-20260514',
			name: 'Claude 4 Sonnet',
			tag: 'Smart',
			tagIcon: Sparkles,
			tagColor: 'text-ghost',
			desc: 'Best balance of speed and intelligence',
			speed: 4,
			quality: 4,
		},
		{
			id: 'claude-4-opus-20260514',
			name: 'Claude 4 Opus',
			tag: 'Powerful',
			tagIcon: Gauge,
			tagColor: 'text-pulse',
			desc: 'Maximum capability for complex tasks',
			speed: 2,
			quality: 5,
		},
	],
	openai: [
		{
			id: 'gpt-4o-mini',
			name: 'GPT-4o Mini',
			tag: 'Fast',
			tagIcon: Zap,
			tagColor: 'text-alive',
			desc: 'Quick and cost effective',
			speed: 5,
			quality: 3,
		},
		{
			id: 'gpt-4o',
			name: 'GPT-4o',
			tag: 'Balanced',
			tagIcon: Sparkles,
			tagColor: 'text-ghost',
			desc: 'Versatile flagship model',
			speed: 4,
			quality: 4,
		},
		{
			id: 'o3',
			name: 'o3',
			tag: 'Reasoning',
			tagIcon: Gauge,
			tagColor: 'text-pulse',
			desc: 'Advanced reasoning and analysis',
			speed: 2,
			quality: 5,
		},
	],
	google: [
		{
			id: 'gemini-2.5-flash',
			name: 'Gemini 2.5 Flash',
			tag: 'Fast',
			tagIcon: Zap,
			tagColor: 'text-alive',
			desc: 'Rapid responses, great efficiency',
			speed: 5,
			quality: 3,
		},
		{
			id: 'gemini-2.5-pro',
			name: 'Gemini 2.5 Pro',
			tag: 'Smart',
			tagIcon: Sparkles,
			tagColor: 'text-ghost',
			desc: 'Top tier multimodal reasoning',
			speed: 3,
			quality: 5,
		},
	],
	ollama: [
		{
			id: 'llama3.3:70b',
			name: 'Llama 3.3 70B',
			tag: 'Smart',
			tagIcon: Sparkles,
			tagColor: 'text-ghost',
			desc: 'Powerful open source model',
			speed: 3,
			quality: 4,
		},
		{
			id: 'llama3.2:8b',
			name: 'Llama 3.2 8B',
			tag: 'Fast',
			tagIcon: Zap,
			tagColor: 'text-alive',
			desc: 'Lightweight and fast locally',
			speed: 5,
			quality: 2,
		},
		{
			id: 'mistral:7b',
			name: 'Mistral 7B',
			tag: 'Balanced',
			tagIcon: Sparkles,
			tagColor: 'text-ghost',
			desc: 'Efficient and capable',
			speed: 4,
			quality: 3,
		},
	],
}

function QualityBar({ value, max = 5 }: { value: number; max?: number }) {
	const bars = Array.from({ length: max }, (_, i) => `bar-${i}`)
	return (
		<div className="flex gap-0.5">
			{bars.map((id, i) => (
				<div key={id} className={`w-4 h-1 ${i < value ? 'bg-ghost' : 'bg-static/20'}`} />
			))}
		</div>
	)
}

export function ModelStep({ data, onChange }: StepProps) {
	const models = MODELS[data.provider ?? 'anthropic'] ?? []

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-display font-bold text-lg text-chrome mb-1">Pick a default model</h2>
				<p className="text-sm font-body text-static">
					You can change this per conversation anytime.
				</p>
			</div>

			<div className="space-y-3">
				{models.map((m) => {
					const active = data.model === m.id
					return (
						<motion.button
							key={m.id}
							type="button"
							whileTap={{ scale: 0.98 }}
							onClick={() => onChange({ model: m.id })}
							className={`w-full text-left p-4 border transition-all cut-tr cut-border ${
								active
									? 'bg-ghost-muted border-[var(--ghost-border)] shadow-[0_0_12px_rgba(0,240,255,0.15)]'
									: 'bg-shell border-[var(--border-default)] hover:border-static'
							}`}
							style={{ '--cut-md': '10px' } as React.CSSProperties}
						>
							<div className="flex items-center gap-2 mb-2">
								<span
									className={`font-display font-semibold text-sm ${active ? 'text-ghost' : 'text-chrome'}`}
								>
									{m.name}
								</span>
								<span
									className={`flex items-center gap-1 text-[10px] font-ui font-bold uppercase ${m.tagColor}`}
								>
									<m.tagIcon size={10} />
									{m.tag}
								</span>
							</div>
							<p className="text-xs font-body text-static mb-3">{m.desc}</p>
							<div className="flex items-center gap-6">
								<div className="flex items-center gap-2">
									<span className="text-[10px] font-ui uppercase text-static">Speed</span>
									<QualityBar value={m.speed} />
								</div>
								<div className="flex items-center gap-2">
									<span className="text-[10px] font-ui uppercase text-static">Quality</span>
									<QualityBar value={m.quality} />
								</div>
							</div>
						</motion.button>
					)
				})}
			</div>
		</div>
	)
}
