import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
	Activity,
	AlertTriangle,
	Eye,
	EyeOff,
	Key,
	Lock,
	Plus,
	RefreshCw,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Trash2,
	X,
} from 'lucide-react'
import { useCallback, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardMetrics {
	injectionBlocked24h: number
	permissionViolations24h: number
	auditEvents24h: number
	securityScore: number
	activeSessions: number
	firewallBlocks24h: number
	totalThreats24h: number
}

interface AuditEntry {
	id: string
	type: string
	skillId: string | null
	details: string
	hash: string
	parentHash: string | null
	createdAt: number
}

interface ThreatInfo {
	id: string
	type: 'injection' | 'permission_violation' | 'rate_limit' | 'firewall'
	source: string
	details: string
	severity: 'low' | 'medium' | 'high' | 'critical'
	blocked: boolean
	createdAt: number
}

interface VaultSecret {
	key: string
	createdAt: number
	rotatedAt: number | null
}

interface PermissionGrant {
	skillId: string
	skillName: string
	permissions: string[]
	grantedAt: number
	revokedAt: number | null
}

interface ScoreResponse {
	score: number
	factors: { name: string; impact: number; status: 'pass' | 'fail' | 'warn' }[]
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, init)
	if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
	return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

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

function MetricCard({
	icon: Icon,
	label,
	value,
	color,
}: {
	icon: typeof Shield
	label: string
	value: string | number
	color: string
}) {
	return (
		<div
			className="bg-shell border border-[var(--border-default)] p-4 cut-tr cut-border relative"
			style={{ '--cut-md': '10px' } as React.CSSProperties}
		>
			<div className="flex items-center gap-2 mb-2">
				<Icon size={14} className={color} />
				<span className="text-xs font-ui font-bold uppercase tracking-wider text-static">
					{label}
				</span>
			</div>
			<span className={`font-display font-bold text-2xl ${color}`}>{value}</span>
		</div>
	)
}

function EmptyState({ icon: Icon, text }: { icon: typeof Shield; text: string }) {
	return (
		<div className="flex flex-col items-center justify-center py-12 gap-3">
			<Icon size={28} className="text-static" />
			<p className="text-xs font-ui text-static">{text}</p>
		</div>
	)
}

function LoadingPulse() {
	return (
		<div className="flex items-center justify-center py-12">
			<motion.div
				animate={{ opacity: [0.3, 1, 0.3] }}
				transition={{ duration: 1.5, repeat: Infinity }}
				className="flex items-center gap-2"
			>
				<Activity size={14} className="text-ghost" />
				<span className="text-xs font-ui text-static">Loading...</span>
			</motion.div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Score Ring
// ---------------------------------------------------------------------------

function ScoreRing({ score }: { score: number }) {
	const radius = 40
	const circumference = 2 * Math.PI * radius
	const offset = circumference - (score / 100) * circumference
	const color =
		score >= 80 ? 'var(--color-alive)' : score >= 50 ? 'var(--color-edge)' : 'var(--color-pulse)'

	return (
		<div className="relative w-24 h-24 flex-shrink-0">
			<svg
				viewBox="0 0 100 100"
				className="w-full h-full -rotate-90"
				role="img"
				aria-label={`Security score: ${score}`}
			>
				<title>Security Score: {score}/100</title>
				<circle
					cx="50"
					cy="50"
					r={radius}
					fill="none"
					stroke="var(--border-default)"
					strokeWidth="6"
				/>
				<motion.circle
					cx="50"
					cy="50"
					r={radius}
					fill="none"
					stroke={color}
					strokeWidth="6"
					strokeLinecap="round"
					strokeDasharray={circumference}
					initial={{ strokeDashoffset: circumference }}
					animate={{ strokeDashoffset: offset }}
					transition={{ duration: 1, ease: 'easeOut' }}
				/>
			</svg>
			<div className="absolute inset-0 flex items-center justify-center">
				<span className="font-display font-bold text-xl text-chrome">{score}</span>
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Threat Overview Section
// ---------------------------------------------------------------------------

function ThreatOverview() {
	const { data: metrics, isLoading } = useQuery({
		queryKey: ['security-dashboard'],
		queryFn: () => fetchJson<DashboardMetrics>('/api/security/dashboard'),
		refetchInterval: 15_000,
	})

	const { data: scoreData } = useQuery({
		queryKey: ['security-score'],
		queryFn: () => fetchJson<ScoreResponse>('/api/security/score'),
		refetchInterval: 30_000,
	})

	if (isLoading) return <LoadingPulse />

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<MetricCard
					icon={ShieldAlert}
					label="Injections Blocked"
					value={metrics?.injectionBlocked24h ?? 0}
					color="text-pulse"
				/>
				<MetricCard
					icon={AlertTriangle}
					label="Permission Violations"
					value={metrics?.permissionViolations24h ?? 0}
					color="text-edge"
				/>
				<MetricCard
					icon={Shield}
					label="Firewall Blocks"
					value={metrics?.firewallBlocks24h ?? 0}
					color="text-ghost"
				/>
				<MetricCard
					icon={Activity}
					label="Audit Events"
					value={metrics?.auditEvents24h ?? 0}
					color="text-chrome"
				/>
			</div>

			{scoreData && (
				<div
					className="bg-shell border border-[var(--border-default)] p-5 cut-tr cut-border"
					style={{ '--cut-md': '12px' } as React.CSSProperties}
				>
					<div className="flex items-start gap-6">
						<ScoreRing score={scoreData.score} />
						<div className="flex-1 min-w-0">
							<h3 className="font-display font-semibold text-sm text-chrome mb-3">
								Security Score
							</h3>
							<div className="space-y-1.5">
								{scoreData.factors.map((f) => (
									<div key={f.name} className="flex items-center gap-2">
										<div
											className={`w-2 h-2 rounded-full flex-shrink-0 ${
												f.status === 'pass'
													? 'bg-alive'
													: f.status === 'fail'
														? 'bg-pulse'
														: 'bg-edge'
											}`}
										/>
										<span className="text-xs font-ui text-chrome truncate">{f.name}</span>
										<span className="text-xs font-code text-static ml-auto flex-shrink-0">
											-{f.impact}
										</span>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

// ---------------------------------------------------------------------------
// Audit Trail Section
// ---------------------------------------------------------------------------

function AuditTrail() {
	const [auditType, setAuditType] = useState<string | null>(null)
	const [page, setPage] = useState(0)
	const pageSize = 20

	const { data, isLoading } = useQuery({
		queryKey: ['security-audit', auditType, page],
		queryFn: () => {
			const params = new URLSearchParams({
				limit: String(pageSize),
				offset: String(page * pageSize),
			})
			if (auditType) params.set('type', auditType)
			return fetchJson<{ entries: AuditEntry[]; total: number }>(`/api/security/audit?${params}`)
		},
		refetchInterval: 10_000,
	})

	const eventTypes = [
		{ value: null, label: 'All Events' },
		{ value: 'system.startup', label: 'System' },
		{ value: 'vault.store', label: 'Vault Store' },
		{ value: 'vault.revoke', label: 'Vault Revoke' },
		{ value: 'permission.revoke', label: 'Perm Revoke' },
	]

	const totalPages = data ? Math.ceil(data.total / pageSize) : 0

	return (
		<Section title="Audit Trail">
			<div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
				{eventTypes.map((et) => {
					const isActive = et.value === auditType
					return (
						<button
							key={et.label}
							type="button"
							onClick={() => {
								setAuditType(et.value)
								setPage(0)
							}}
							className={`
								px-3 py-1.5 text-xs font-ui font-medium transition-all flex-shrink-0 cut-tr
								${
									isActive
										? 'bg-ghost-muted text-ghost border border-[var(--ghost-border)]'
										: 'text-static border border-[var(--border-default)] hover:text-chrome hover:border-[var(--border-hover)]'
								}
							`}
							style={{ '--cut-md': '6px' } as React.CSSProperties}
						>
							{et.label}
						</button>
					)
				})}
			</div>

			{isLoading ? (
				<LoadingPulse />
			) : !data || data.entries.length === 0 ? (
				<EmptyState icon={Eye} text="No audit entries found" />
			) : (
				<>
					<div className="overflow-x-auto">
						<table className="w-full text-left">
							<thead>
								<tr className="border-b border-[var(--border-default)]">
									<th className="text-xs font-ui font-bold uppercase tracking-wider text-static pb-2 pr-4">
										Time
									</th>
									<th className="text-xs font-ui font-bold uppercase tracking-wider text-static pb-2 pr-4">
										Event Type
									</th>
									<th className="text-xs font-ui font-bold uppercase tracking-wider text-static pb-2 pr-4">
										Skill
									</th>
									<th className="text-xs font-ui font-bold uppercase tracking-wider text-static pb-2 pr-4">
										Details
									</th>
									<th className="text-xs font-ui font-bold uppercase tracking-wider text-static pb-2">
										Hash
									</th>
								</tr>
							</thead>
							<tbody>
								{data.entries.map((entry) => (
									<tr
										key={entry.id}
										className="border-b border-[var(--border-default)] hover:bg-void/30 transition-colors"
									>
										<td className="text-xs font-code text-static py-2.5 pr-4 whitespace-nowrap">
											{new Date(entry.createdAt).toLocaleString()}
										</td>
										<td className="text-xs font-code text-ghost py-2.5 pr-4 whitespace-nowrap">
											{entry.type}
										</td>
										<td className="text-xs font-code text-chrome py-2.5 pr-4">
											{entry.skillId ?? '-'}
										</td>
										<td className="text-xs font-code text-chrome py-2.5 pr-4 max-w-[300px] truncate">
											{entry.details}
										</td>
										<td className="text-xs font-code text-static py-2.5 whitespace-nowrap">
											{entry.hash.slice(0, 12)}...
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{totalPages > 1 && (
						<div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-default)]">
							<span className="text-xs font-ui text-static">
								{data.total} entries &middot; page {page + 1} of {totalPages}
							</span>
							<div className="flex items-center gap-2">
								<button
									type="button"
									disabled={page === 0}
									onClick={() => setPage((p) => p - 1)}
									className="px-3 py-1 text-xs font-ui text-static border border-[var(--border-default)] hover:text-chrome hover:border-[var(--border-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
								>
									Prev
								</button>
								<button
									type="button"
									disabled={page + 1 >= totalPages}
									onClick={() => setPage((p) => p + 1)}
									className="px-3 py-1 text-xs font-ui text-static border border-[var(--border-default)] hover:text-chrome hover:border-[var(--border-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
								>
									Next
								</button>
							</div>
						</div>
					)}
				</>
			)}
		</Section>
	)
}

// ---------------------------------------------------------------------------
// Permissions Section
// ---------------------------------------------------------------------------

function Permissions() {
	const queryClient = useQueryClient()

	const { data, isLoading } = useQuery({
		queryKey: ['security-permissions'],
		queryFn: () => fetchJson<{ grants: PermissionGrant[] }>('/api/security/permissions'),
	})

	const revokeMutation = useMutation({
		mutationFn: (skillId: string) =>
			fetchJson(`/api/security/permissions/${skillId}/revoke`, { method: 'POST' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['security-permissions'] })
			queryClient.invalidateQueries({ queryKey: ['security-audit'] })
			queryClient.invalidateQueries({ queryKey: ['security-score'] })
		},
	})

	if (isLoading) return <LoadingPulse />

	const activeGrants = data?.grants.filter((g) => !g.revokedAt) ?? []

	return (
		<Section title="Permissions">
			{activeGrants.length === 0 ? (
				<EmptyState icon={ShieldCheck} text="No active permission grants" />
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{activeGrants.map((grant) => (
						<div
							key={grant.skillId}
							className="flex items-start gap-3 px-4 py-3 border border-[var(--border-default)] bg-void/30"
						>
							<ShieldCheck size={16} className="text-ghost mt-0.5 flex-shrink-0" />
							<div className="flex-1 min-w-0">
								<span className="text-sm font-ui font-medium text-chrome block truncate">
									{grant.skillName}
								</span>
								<span className="text-xs font-code text-static block mt-0.5">{grant.skillId}</span>
								<div className="flex flex-wrap gap-1 mt-2">
									{grant.permissions.map((perm) => (
										<span
											key={perm}
											className="px-1.5 py-0.5 text-[10px] font-code bg-ghost-muted text-ghost border border-[var(--ghost-border)]"
										>
											{perm}
										</span>
									))}
								</div>
								<span className="text-[10px] font-ui text-static block mt-2">
									Granted {new Date(grant.grantedAt).toLocaleDateString()}
								</span>
							</div>
							<button
								type="button"
								onClick={() => revokeMutation.mutate(grant.skillId)}
								disabled={revokeMutation.isPending}
								className="text-static hover:text-pulse transition-colors flex-shrink-0 p-1"
								title="Revoke all permissions"
							>
								<Trash2 size={14} />
							</button>
						</div>
					))}
				</div>
			)}
		</Section>
	)
}

// ---------------------------------------------------------------------------
// Secrets Vault Section
// ---------------------------------------------------------------------------

function SecretsVault() {
	const queryClient = useQueryClient()
	const [showModal, setShowModal] = useState(false)
	const [newKey, setNewKey] = useState('')
	const [newSecret, setNewSecret] = useState('')
	const [showSecretInput, setShowSecretInput] = useState(false)

	const { data, isLoading } = useQuery({
		queryKey: ['security-vault'],
		queryFn: () => fetchJson<{ secrets: VaultSecret[] }>('/api/security/vault'),
	})

	const storeMutation = useMutation({
		mutationFn: (body: { key: string; secret: string }) =>
			fetchJson('/api/security/vault', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['security-vault'] })
			queryClient.invalidateQueries({ queryKey: ['security-audit'] })
			queryClient.invalidateQueries({ queryKey: ['security-score'] })
			setShowModal(false)
			setNewKey('')
			setNewSecret('')
		},
	})

	const revokeMutation = useMutation({
		mutationFn: (key: string) =>
			fetchJson(`/api/security/vault/${encodeURIComponent(key)}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['security-vault'] })
			queryClient.invalidateQueries({ queryKey: ['security-audit'] })
			queryClient.invalidateQueries({ queryKey: ['security-score'] })
		},
	})

	const handleStore = useCallback(() => {
		if (!newKey.trim() || !newSecret.trim()) return
		storeMutation.mutate({ key: newKey.trim(), secret: newSecret })
	}, [newKey, newSecret, storeMutation])

	return (
		<Section title="Secrets Vault">
			<div className="flex items-center justify-between mb-4">
				<span className="text-xs font-ui text-static">
					{data?.secrets.length ?? 0} secret{(data?.secrets.length ?? 0) !== 1 ? 's' : ''} stored
				</span>
				<button
					type="button"
					onClick={() => setShowModal(true)}
					className="flex items-center gap-1.5 px-3 py-1.5 bg-ghost text-void font-ui text-xs font-bold uppercase tracking-wider cut-tr hover:bg-ghost-hover hover:drop-shadow-[0_0_10px_rgba(0,240,255,0.4)] transition-all"
					style={{ '--cut-md': '6px' } as React.CSSProperties}
				>
					<Plus size={12} />
					Add Secret
				</button>
			</div>

			{isLoading ? (
				<LoadingPulse />
			) : !data || data.secrets.length === 0 ? (
				<EmptyState icon={Lock} text="No secrets stored in the vault" />
			) : (
				<div className="space-y-2">
					{data.secrets.map((secret) => (
						<div
							key={secret.key}
							className="flex items-center gap-3 px-4 py-3 border border-[var(--border-default)] bg-void/30"
						>
							<Key size={14} className="text-ghost flex-shrink-0" />
							<div className="flex-1 min-w-0">
								<span className="text-sm font-code text-chrome block truncate">{secret.key}</span>
								<span className="text-[10px] font-ui text-static">
									Created {new Date(secret.createdAt).toLocaleDateString()}
									{secret.rotatedAt && (
										<> &middot; Rotated {new Date(secret.rotatedAt).toLocaleDateString()}</>
									)}
								</span>
							</div>
							<button
								type="button"
								onClick={() =>
									storeMutation.mutate({
										key: secret.key,
										secret: `rotated_${Date.now()}`,
									})
								}
								disabled={storeMutation.isPending}
								className="text-static hover:text-edge transition-colors p-1"
								title="Rotate secret"
							>
								<RefreshCw size={14} />
							</button>
							<button
								type="button"
								onClick={() => revokeMutation.mutate(secret.key)}
								disabled={revokeMutation.isPending}
								className="text-static hover:text-pulse transition-colors p-1"
								title="Revoke secret"
							>
								<Trash2 size={14} />
							</button>
						</div>
					))}
				</div>
			)}

			{/* Add Secret Modal */}
			<AnimatePresence>
				{showModal && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
						onClick={() => setShowModal(false)}
					>
						<motion.div
							initial={{ opacity: 0, scale: 0.95, y: 10 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: 10 }}
							onClick={(e) => e.stopPropagation()}
							className="bg-shell border border-[var(--border-default)] w-full max-w-md cut-tr cut-border"
							style={{ '--cut-md': '12px' } as React.CSSProperties}
						>
							<div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)]">
								<h3 className="font-display font-semibold text-sm text-chrome">Add Secret</h3>
								<button
									type="button"
									onClick={() => setShowModal(false)}
									className="text-static hover:text-chrome transition-colors"
								>
									<X size={16} />
								</button>
							</div>
							<div className="p-5 space-y-4">
								<div className="space-y-1.5">
									<label
										htmlFor="vault-key"
										className="text-xs font-ui font-bold uppercase tracking-wider text-static block"
									>
										Key
									</label>
									<input
										id="vault-key"
										type="text"
										value={newKey}
										onChange={(e) => setNewKey(e.target.value)}
										placeholder="MY_API_KEY"
										className="w-full bg-void text-chrome font-code text-sm px-3 py-2.5 border border-[var(--border-default)] focus:border-ghost focus:shadow-[0_0_0_1px_var(--ghost-border)] outline-none transition-[border-color,box-shadow] placeholder:text-static"
									/>
								</div>
								<div className="space-y-1.5">
									<label
										htmlFor="vault-secret"
										className="text-xs font-ui font-bold uppercase tracking-wider text-static block"
									>
										Secret Value
									</label>
									<div className="relative">
										<input
											id="vault-secret"
											type={showSecretInput ? 'text' : 'password'}
											value={newSecret}
											onChange={(e) => setNewSecret(e.target.value)}
											placeholder="Enter secret value"
											className="w-full bg-void text-chrome font-code text-sm px-3 py-2.5 pr-10 border border-[var(--border-default)] focus:border-ghost focus:shadow-[0_0_0_1px_var(--ghost-border)] outline-none transition-[border-color,box-shadow] placeholder:text-static"
										/>
										<button
											type="button"
											onClick={() => setShowSecretInput(!showSecretInput)}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-static hover:text-chrome transition-colors"
										>
											{showSecretInput ? <EyeOff size={14} /> : <Eye size={14} />}
										</button>
									</div>
								</div>
								<div className="flex items-center justify-end gap-3 pt-2">
									<button
										type="button"
										onClick={() => setShowModal(false)}
										className="px-4 py-2 text-xs font-ui font-medium text-static hover:text-chrome transition-colors"
									>
										Cancel
									</button>
									<button
										type="button"
										onClick={handleStore}
										disabled={!newKey.trim() || !newSecret.trim() || storeMutation.isPending}
										className="flex items-center gap-2 px-4 py-2 bg-ghost text-void font-ui text-xs font-bold uppercase tracking-wider cut-tr hover:bg-ghost-hover hover:drop-shadow-[0_0_10px_rgba(0,240,255,0.4)] transition-all disabled:opacity-50"
										style={{ '--cut-md': '8px' } as React.CSSProperties}
									>
										<Lock size={12} />
										{storeMutation.isPending ? 'Storing...' : 'Store Secret'}
									</button>
								</div>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</Section>
	)
}

// ---------------------------------------------------------------------------
// Threats Table
// ---------------------------------------------------------------------------

function ThreatsTable() {
	const { data, isLoading } = useQuery({
		queryKey: ['security-threats'],
		queryFn: () => fetchJson<{ threats: ThreatInfo[]; total: number }>('/api/security/threats'),
		refetchInterval: 10_000,
	})

	if (isLoading) return <LoadingPulse />
	if (!data || data.threats.length === 0) {
		return <EmptyState icon={ShieldCheck} text="No threats detected in the last 24 hours" />
	}

	const severityColor: Record<string, string> = {
		critical: 'text-pulse',
		high: 'text-pulse',
		medium: 'text-edge',
		low: 'text-static',
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left">
				<thead>
					<tr className="border-b border-[var(--border-default)]">
						<th className="text-xs font-ui font-bold uppercase tracking-wider text-static pb-2 pr-4">
							Time
						</th>
						<th className="text-xs font-ui font-bold uppercase tracking-wider text-static pb-2 pr-4">
							Type
						</th>
						<th className="text-xs font-ui font-bold uppercase tracking-wider text-static pb-2 pr-4">
							Severity
						</th>
						<th className="text-xs font-ui font-bold uppercase tracking-wider text-static pb-2 pr-4">
							Source
						</th>
						<th className="text-xs font-ui font-bold uppercase tracking-wider text-static pb-2 pr-4">
							Details
						</th>
						<th className="text-xs font-ui font-bold uppercase tracking-wider text-static pb-2">
							Blocked
						</th>
					</tr>
				</thead>
				<tbody>
					{data.threats.map((threat) => (
						<tr
							key={threat.id}
							className="border-b border-[var(--border-default)] hover:bg-void/30 transition-colors"
						>
							<td className="text-xs font-code text-static py-2.5 pr-4 whitespace-nowrap">
								{new Date(threat.createdAt).toLocaleTimeString()}
							</td>
							<td className="text-xs font-code text-ghost py-2.5 pr-4 whitespace-nowrap">
								{threat.type}
							</td>
							<td
								className={`text-xs font-ui font-bold uppercase py-2.5 pr-4 ${severityColor[threat.severity] ?? 'text-static'}`}
							>
								{threat.severity}
							</td>
							<td className="text-xs font-code text-chrome py-2.5 pr-4 whitespace-nowrap">
								{threat.source}
							</td>
							<td className="text-xs font-code text-chrome py-2.5 pr-4 max-w-[250px] truncate">
								{threat.details}
							</td>
							<td className="py-2.5">
								{threat.blocked ? (
									<span className="text-xs font-ui font-bold text-alive">YES</span>
								) : (
									<span className="text-xs font-ui font-bold text-pulse">NO</span>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function SecurityPage() {
	return (
		<div className="h-full overflow-y-auto">
			<div className="max-w-5xl mx-auto px-6 py-6">
				<div className="flex items-center gap-3 mb-6">
					<Shield size={20} className="text-ghost" />
					<h1 className="font-display font-bold text-xl text-chrome">Security</h1>
				</div>

				<div className="space-y-6">
					{/* Threat Overview */}
					<ThreatOverview />

					{/* Recent Threats */}
					<Section title="Recent Threats">
						<ThreatsTable />
					</Section>

					{/* Audit Trail */}
					<AuditTrail />

					{/* Permissions & Vault side-by-side on larger screens */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<Permissions />
						<SecretsVault />
					</div>
				</div>
			</div>
		</div>
	)
}
