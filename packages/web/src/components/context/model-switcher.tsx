import { ChevronDown, Cpu } from 'lucide-react'
import { useRef, useState } from 'react'

interface ModelOption {
	id: string
	label: string
	detail: string
}

interface ModelGroup {
	label: string
	models: ModelOption[]
}

const MODEL_GROUPS: ModelGroup[] = [
	{
		label: 'Presets',
		models: [
			{ id: 'fast', label: 'Fast', detail: 'Low latency, low cost' },
			{ id: 'smart', label: 'Smart', detail: 'Best quality, higher cost' },
			{ id: 'balanced', label: 'Balanced', detail: 'Good balance of speed and quality' },
		],
	},
	{
		label: 'Anthropic',
		models: [
			{ id: 'claude-4-opus', label: 'Claude 4 Opus', detail: 'Most capable' },
			{ id: 'claude-4-sonnet', label: 'Claude 4 Sonnet', detail: 'Fast and capable' },
			{ id: 'claude-4-haiku', label: 'Claude 4 Haiku', detail: 'Fastest, cheapest' },
		],
	},
	{
		label: 'OpenAI',
		models: [
			{ id: 'gpt-4o', label: 'GPT-4o', detail: 'Multimodal flagship' },
			{ id: 'gpt-4o-mini', label: 'GPT-4o Mini', detail: 'Fast and affordable' },
			{ id: 'o3', label: 'o3', detail: 'Advanced reasoning' },
		],
	},
	{
		label: 'Ollama',
		models: [
			{ id: 'llama3.3', label: 'Llama 3.3', detail: 'Local, 70B' },
			{ id: 'qwen3', label: 'Qwen 3', detail: 'Local, multilingual' },
		],
	},
]

interface ModelSwitcherProps {
	currentModel: string
	onSelect: (model: string) => void
}

export function ModelSwitcher({ currentModel, onSelect }: ModelSwitcherProps) {
	const [open, setOpen] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)

	const currentLabel =
		MODEL_GROUPS.flatMap((g) => g.models).find((m) => m.id === currentModel)?.label ?? currentModel

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				onClick={() => setOpen((p) => !p)}
				onBlur={(e) => {
					if (!containerRef.current?.contains(e.relatedTarget)) setOpen(false)
				}}
				className="w-full flex items-center gap-2 px-3 py-2 bg-void border border-(--border-default) hover:border-(--ghost-border) text-chrome text-xs font-ui transition-colors cut-tr"
				style={{ '--cut-md': '6px' } as React.CSSProperties}
			>
				<Cpu size={14} className="text-ghost shrink-0" />
				<span className="flex-1 text-left truncate">{currentLabel}</span>
				<ChevronDown
					size={12}
					className={`text-static transition-transform ${open ? 'rotate-180' : ''}`}
				/>
			</button>
			{open && (
				<div
					className="absolute z-50 top-full left-0 right-0 mt-1 bg-shell border border-(--ghost-border) max-h-64 overflow-y-auto cut-tr"
					style={{ '--cut-md': '6px' } as React.CSSProperties}
				>
					{MODEL_GROUPS.map((group) => (
						<div key={group.label}>
							<div className="px-3 py-1.5 text-[10px] font-ui font-bold uppercase tracking-widest text-static">
								{group.label}
							</div>
							{group.models.map((model) => (
								<button
									key={model.id}
									type="button"
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => {
										onSelect(model.id)
										setOpen(false)
									}}
									className={`w-full text-left px-3 py-2 flex flex-col gap-0.5 transition-colors ${
										model.id === currentModel
											? 'bg-ghost-muted text-ghost'
											: 'text-chrome hover:bg-[rgba(0,240,255,0.05)]'
									}`}
								>
									<span className="text-xs font-ui">{model.label}</span>
									<span className="text-[10px] text-static">{model.detail}</span>
								</button>
							))}
						</div>
					))}
				</div>
			)}
		</div>
	)
}
