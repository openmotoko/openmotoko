import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { DollarSign, Save, TrendingUp } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { BudgetBar } from '../components/costs/budget-bar'
import { CostChart } from '../components/costs/cost-chart'
import type { BudgetSettings } from '../lib/api'
import { api } from '../lib/api'

function BreakdownTable({ rows }: { rows: { name: string; cost: number; tokens: number }[] }) {
	if (rows.length === 0) {
		return <p className="text-xs font-ui text-static py-4 text-center">No data</p>
	}

	return (
		<div className="space-y-1">
			{rows.map((r) => (
				<div
					key={r.name}
					className="flex items-center justify-between px-3 py-2 bg-void/30 border border-[var(--border-default)]"
				>
					<span className="text-sm font-code text-chrome truncate">{r.name}</span>
					<div className="flex items-center gap-4 flex-shrink-0">
						<span className="text-xs font-code text-static">{r.tokens.toLocaleString()} tok</span>
						<span className="text-sm font-code text-ghost">${r.cost.toFixed(4)}</span>
					</div>
				</div>
			))}
		</div>
	)
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div
			className="bg-shell border border-[var(--border-default)] cut-tr cut-border"
			style={{ '--cut-md': '12px' } as React.CSSProperties}
		>
			<div className="px-5 py-3 border-b border-[var(--border-default)] cut-notch scanlines">
				<h2 className="font-display font-semibold text-sm text-chrome relative z-10">{title}</h2>
			</div>
			<div className="p-5">{children}</div>
		</div>
	)
}

function BudgetForm({ budget }: { budget: BudgetSettings }) {
	const queryClient = useQueryClient()
	const [daily, setDaily] = useState(String(budget.daily))
	const [monthly, setMonthly] = useState(String(budget.monthly))
	const [dirty, setDirty] = useState(false)

	useEffect(() => {
		setDaily(String(budget.daily))
		setMonthly(String(budget.monthly))
		setDirty(false)
	}, [budget])

	const mutation = useMutation({
		mutationFn: (data: BudgetSettings) => api.updateBudget(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['budget'] })
			setDirty(false)
		},
	})

	const handleSave = useCallback(() => {
		mutation.mutate({
			daily: parseFloat(daily) || 0,
			monthly: parseFloat(monthly) || 0,
			alertThresholds: budget.alertThresholds,
		})
	}, [daily, monthly, budget.alertThresholds, mutation])

	const handleChange = useCallback((setter: (v: string) => void, value: string) => {
		setter(value)
		setDirty(true)
	}, [])

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-1.5">
					<label
						htmlFor="budget-daily"
						className="text-xs font-ui font-bold uppercase tracking-wider text-static block"
					>
						Daily Limit ($)
					</label>
					<input
						id="budget-daily"
						type="number"
						step="0.01"
						min="0"
						value={daily}
						onChange={(e) => handleChange(setDaily, e.target.value)}
						className="w-full bg-void text-chrome font-body text-sm px-3 py-2.5 border border-[var(--border-default)] focus:border-ghost focus:shadow-[0_0_0_1px_var(--ghost-border)] outline-none transition-[border-color,box-shadow]"
					/>
				</div>
				<div className="space-y-1.5">
					<label
						htmlFor="budget-monthly"
						className="text-xs font-ui font-bold uppercase tracking-wider text-static block"
					>
						Monthly Limit ($)
					</label>
					<input
						id="budget-monthly"
						type="number"
						step="0.01"
						min="0"
						value={monthly}
						onChange={(e) => handleChange(setMonthly, e.target.value)}
						className="w-full bg-void text-chrome font-body text-sm px-3 py-2.5 border border-[var(--border-default)] focus:border-ghost focus:shadow-[0_0_0_1px_var(--ghost-border)] outline-none transition-[border-color,box-shadow]"
					/>
				</div>
			</div>
			{dirty && (
				<motion.button
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					type="button"
					onClick={handleSave}
					disabled={mutation.isPending}
					className="flex items-center gap-2 px-4 py-2 bg-ghost text-void font-ui text-xs font-bold uppercase tracking-wider cut-tr hover:bg-ghost-hover hover:drop-shadow-[0_0_10px_rgba(0,240,255,0.4)] transition-all disabled:opacity-50"
					style={{ '--cut-md': '8px' } as React.CSSProperties}
				>
					<Save size={12} />
					{mutation.isPending ? 'Saving...' : 'Save Budget'}
				</motion.button>
			)}
		</div>
	)
}

export function CostsPage() {
	const { data: today } = useQuery({
		queryKey: ['costs-today'],
		queryFn: () => api.getCostsToday(),
		refetchInterval: 15000,
	})

	const { data: history } = useQuery({
		queryKey: ['costs-history'],
		queryFn: () => api.getCostHistory(30),
	})

	const { data: breakdown } = useQuery({
		queryKey: ['costs-breakdown'],
		queryFn: () => api.getCostBreakdown('7d'),
	})

	const { data: budget } = useQuery({
		queryKey: ['budget'],
		queryFn: () => api.getBudget(),
	})

	return (
		<div className="h-full overflow-y-auto">
			<div className="max-w-4xl mx-auto px-6 py-6">
				<div className="flex items-center gap-3 mb-6">
					<DollarSign size={20} className="text-ghost" />
					<h1 className="font-display font-bold text-xl text-chrome">Costs</h1>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
					<div
						className="bg-shell border border-[var(--ghost-border)] p-5 cut-tr cut-border col-span-1 md:col-span-2"
						style={{ '--cut-md': '12px' } as React.CSSProperties}
					>
						<span className="text-xs font-ui font-bold uppercase tracking-wider text-static block mb-1">
							Today
						</span>
						<span
							className="font-display font-bold text-4xl text-ghost"
							style={{ textShadow: '0 0 20px rgba(0, 240, 255, 0.5)' }}
						>
							${(today?.total ?? 0).toFixed(4)}
						</span>
					</div>
					<div
						className="bg-shell border border-[var(--border-default)] p-5 cut-tr cut-border flex flex-col justify-center"
						style={{ '--cut-md': '10px' } as React.CSSProperties}
					>
						<TrendingUp size={14} className="text-edge mb-1" />
						<span className="text-xs font-ui font-bold uppercase tracking-wider text-static block mb-1">
							7d Total
						</span>
						<span className="font-display font-bold text-xl text-edge">
							${(breakdown?.providers.reduce((s, p) => s + p.cost, 0) ?? 0).toFixed(4)}
						</span>
					</div>
				</div>

				{budget && (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
						<BudgetBar
							spent={today?.total ?? 0}
							limit={budget.daily}
							label="Daily Budget"
							thresholds={budget.alertThresholds}
						/>
						<BudgetBar
							spent={breakdown?.providers.reduce((s, p) => s + p.cost, 0) ?? 0}
							limit={budget.monthly}
							label="Monthly Budget"
							thresholds={budget.alertThresholds}
						/>
					</div>
				)}

				<div className="space-y-6">
					<Section title="30-Day History">
						<CostChart data={history ?? []} />
					</Section>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<Section title="By Provider">
							<BreakdownTable rows={breakdown?.providers ?? []} />
						</Section>
						<Section title="By Model">
							<BreakdownTable rows={breakdown?.models ?? []} />
						</Section>
					</div>

					<Section title="Budget Limits">
						{budget ? (
							<BudgetForm budget={budget} />
						) : (
							<p className="text-xs font-ui text-static">Loading...</p>
						)}
					</Section>
				</div>
			</div>
		</div>
	)
}
