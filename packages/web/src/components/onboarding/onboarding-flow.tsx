import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, SkipForward } from 'lucide-react'
import { useCallback, useState } from 'react'
import { api } from '../../lib/api'
import { ChannelStep } from './steps/channel-step'
import { ModelStep } from './steps/model-step'
import { ProviderStep } from './steps/provider-step'
import { SkillsStep } from './steps/skills-step'
import { WelcomeStep } from './steps/welcome-step'
import type { OnboardingData } from './types'

const LABELS = ['Provider', 'Model', 'Channels', 'Skills', 'Ready']

const variants = {
	enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
	center: { x: 0, opacity: 1 },
	exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
}

const PROVIDER_KEY_MAP: Record<string, string> = {
	anthropic: 'anthropicApiKey',
	openai: 'openaiApiKey',
	google: 'googleAiApiKey',
}

export function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
	const [step, setStep] = useState(0)
	const [dir, setDir] = useState(1)
	const [data, setData] = useState<OnboardingData>({
		provider: null,
		apiKey: '',
		ollamaHost: 'http://localhost:11434',
		model: null,
		enabledSkills: [],
	})

	const update = useCallback((patch: Partial<OnboardingData>) => {
		setData((prev) => ({ ...prev, ...patch }))
	}, [])

	const go = (target: number) => {
		setDir(target > step ? 1 : -1)
		setStep(target)
	}

	const canNext =
		step === 0
			? data.provider !== null &&
				(data.provider === 'ollama' ? data.ollamaHost.length > 0 : data.apiKey.length > 0)
			: step === 1
				? data.model !== null
				: true

	const finish = async () => {
		const settings: Record<string, unknown> = { defaultModel: data.model, onboardingComplete: true }
		if (data.provider && data.provider !== 'ollama') {
			settings[PROVIDER_KEY_MAP[data.provider]] = data.apiKey
		}
		if (data.provider === 'ollama') {
			settings.ollamaHost = data.ollamaHost
		}
		try {
			await api.updateSettings(settings)
		} catch {
			/* persist failure is non-blocking */
		}
		onComplete()
	}

	const steps = [
		<ProviderStep key="p" data={data} onChange={update} />,
		<ModelStep key="m" data={data} onChange={update} />,
		<ChannelStep key="c" data={data} onChange={update} />,
		<SkillsStep key="s" data={data} onChange={update} />,
		<WelcomeStep key="w" data={data} onComplete={finish} />,
	]

	return (
		<div className="flex flex-col h-full bg-void">
			<div className="flex items-center justify-center gap-3 pt-8 pb-4">
				{LABELS.map((label, i) => (
					<div key={label} className="flex items-center gap-3">
						<div className="flex flex-col items-center gap-1.5">
							<div
								className={`w-2.5 h-2.5 transition-all duration-300 ${
									i === step
										? 'bg-ghost shadow-[0_0_10px_var(--ghost)] scale-125'
										: i < step
											? 'bg-alive'
											: 'bg-static/30'
								}`}
								style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
							/>
							<span
								className={`text-[10px] font-ui uppercase tracking-wider ${i === step ? 'text-ghost' : 'text-static'}`}
							>
								{label}
							</span>
						</div>
						{i < 4 && <div className={`w-8 h-px mb-4 ${i < step ? 'bg-alive' : 'bg-static/20'}`} />}
					</div>
				))}
			</div>

			<div className="flex-1 min-h-0 overflow-hidden relative">
				<AnimatePresence mode="wait" custom={dir}>
					<motion.div
						key={step}
						custom={dir}
						variants={variants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
						className="absolute inset-0 overflow-y-auto px-6"
					>
						<div className="max-w-2xl mx-auto py-6">{steps[step]}</div>
					</motion.div>
				</AnimatePresence>
			</div>

			{step < 4 && (
				<div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-default)]">
					<button
						type="button"
						onClick={() => go(step - 1)}
						disabled={step === 0}
						className="flex items-center gap-2 px-4 py-2 text-xs font-ui font-bold uppercase tracking-wider text-static hover:text-chrome transition-colors disabled:opacity-30"
					>
						<ArrowLeft size={14} />
						Back
					</button>
					<span className="text-xs font-code text-static">{step + 1} / 5</span>
					<div className="flex items-center gap-3">
						{(step === 2 || step === 3) && (
							<button
								type="button"
								onClick={() => go(step + 1)}
								className="flex items-center gap-2 px-4 py-2 text-xs font-ui font-bold uppercase tracking-wider text-static hover:text-chrome transition-colors"
							>
								Skip
								<SkipForward size={14} />
							</button>
						)}
						<button
							type="button"
							onClick={() => go(step + 1)}
							disabled={!canNext}
							className="flex items-center gap-2 px-5 py-2 bg-ghost text-void font-ui text-xs font-bold uppercase tracking-wider cut-tr hover:bg-ghost-hover hover:drop-shadow-[0_0_10px_rgba(0,240,255,0.4)] transition-all disabled:opacity-30 disabled:hover:drop-shadow-none"
							style={{ '--cut-md': '8px' } as React.CSSProperties}
						>
							Next
							<ArrowRight size={14} />
						</button>
					</div>
				</div>
			)}
		</div>
	)
}
