import { motion } from 'framer-motion'
import { Gauge, Sparkles, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ProviderModelInfo } from '../../../lib/api'
import { api } from '../../../lib/api'
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

const FALLBACK_MODELS: Record<string, ModelOption[]> = {
	anthropic: [
		{
			id: 'claude-haiku-4-5',
			name: 'Claude Haiku 4.5',
			tag: 'Fast',
			tagIcon: Zap,
			tagColor: 'text-alive',
			desc: 'Lightning fast, great for simple tasks',
			speed: 5,
			quality: 3,
		},
		{
			id: 'claude-sonnet-4-6',
			name: 'Claude Sonnet 4.6',
			tag: 'Smart',
			tagIcon: Sparkles,
			tagColor: 'text-ghost',
			desc: 'Best balance of speed and intelligence',
			speed: 4,
			quality: 4,
		},
		{
			id: 'claude-opus-4-6',
			name: 'Claude Opus 4.6',
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
			id: 'gpt-5-mini',
			name: 'GPT-5 Mini',
			tag: 'Fast',
			tagIcon: Zap,
			tagColor: 'text-alive',
			desc: 'Quick and cost effective',
			speed: 5,
			quality: 3,
		},
		{
			id: 'gpt-5.2',
			name: 'GPT-5.2',
			tag: 'Smart',
			tagIcon: Sparkles,
			tagColor: 'text-ghost',
			desc: 'Latest flagship model',
			speed: 4,
			quality: 5,
		},
		{
			id: 'o4-mini',
			name: 'o4 Mini',
			tag: 'Reasoning',
			tagIcon: Gauge,
			tagColor: 'text-pulse',
			desc: 'Advanced reasoning and analysis',
			speed: 3,
			quality: 4,
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
			id: 'qwen3:8b',
			name: 'Qwen 3 8B',
			tag: 'Fast',
			tagIcon: Zap,
			tagColor: 'text-alive',
			desc: 'Lightweight and fast locally',
			speed: 5,
			quality: 2,
		},
	],
}

function apiModelToOption(m: ProviderModelInfo): ModelOption {
	const cost = m.costPer1kOutput
	if (cost >= 0.01) {
		return {
			id: m.id,
			name: m.name,
			tag: 'Powerful',
			tagIcon: Gauge,
			tagColor: 'text-pulse',
			desc: `${m.contextWindow >= 200_000 ? '200k' : `${Math.round(m.contextWindow / 1000)}k`} context`,
			speed: 2,
			quality: 5,
		}
	}
	if (cost >= 0.003) {
		return {
			id: m.id,
			name: m.name,
			tag: 'Smart',
			tagIcon: Sparkles,
			tagColor: 'text-ghost',
			desc: `${m.contextWindow >= 200_000 ? '200k' : `${Math.round(m.contextWindow / 1000)}k`} context`,
			speed: 4,
			quality: 4,
		}
	}
	return {
		id: m.id,
		name: m.name,
		tag: 'Fast',
		tagIcon: Zap,
		tagColor: 'text-alive',
		desc: `${m.contextWindow >= 200_000 ? '200k' : `${Math.round(m.contextWindow / 1000)}k`} context`,
		speed: 5,
		quality: 3,
	}
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
	const provider = data.provider ?? 'anthropic'
	const [models, setModels] = useState<ModelOption[]>(FALLBACK_MODELS[provider] ?? [])

	useEffect(() => {
		setModels(FALLBACK_MODELS[provider] ?? [])

		let cancelled = false
		api
			.getModels()
			.then((res) => {
				if (cancelled) return
				const match = res.providers.find((p) => p.id === provider)
				if (match && match.models.length > 0) {
					setModels(match.models.slice(0, 6).map(apiModelToOption))
				}
			})
			.catch(() => {})

		return () => {
			cancelled = true
		}
	}, [provider])

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-display font-bold text-lg text-chrome mb-1">Pick a default model</h2>
				<p className="text-sm font-body text-chrome/60">
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
									? 'bg-ghost-muted border-(--ghost-border) shadow-[0_0_12px_rgba(0,240,255,0.15)]'
									: 'bg-shell border-(--border-default) hover:border-static'
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
							<p className="text-xs font-body text-chrome/50 mb-3">{m.desc}</p>
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
