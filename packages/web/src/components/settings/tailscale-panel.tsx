import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Globe, Monitor, Power, PowerOff, RefreshCw, Wifi } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../lib/api'

interface TailscaleStatusResponse {
	installed: boolean
	running: boolean
	version: string | null
	hostname: string | null
	magicDns: string | null
	tailnetName: string | null
	ipv4: string | null
	online: boolean
	serve: {
		serving: boolean
		port: number
		protocol: string
		url: string | null
	}
}

interface TailscaleNode {
	id: string
	hostname: string
	dnsName: string
	os: string
	online: boolean
	ipv4: string | null
}

export function TailscalePanel() {
	const queryClient = useQueryClient()
	const [showNodes, setShowNodes] = useState(false)

	const { data: status, isLoading } = useQuery({
		queryKey: ['tailscale-status'],
		queryFn: () => api.getTailscaleStatus() as Promise<TailscaleStatusResponse>,
		refetchInterval: 30_000,
	})

	const { data: nodes } = useQuery({
		queryKey: ['tailscale-nodes'],
		queryFn: () => api.getTailscaleNodes() as Promise<TailscaleNode[]>,
		enabled: showNodes,
	})

	const startMutation = useMutation({
		mutationFn: () => api.startTailscaleServe(),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tailscale-status'] }),
	})

	const stopMutation = useMutation({
		mutationFn: () => api.stopTailscaleServe(),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tailscale-status'] }),
	})

	if (isLoading) {
		return (
			<div className="p-4 bg-shell border border-[var(--border-default)] cut-corners-sm">
				<div className="h-4 w-32 bg-panel animate-pulse rounded" />
			</div>
		)
	}

	if (!status?.installed) {
		return (
			<div className="p-4 bg-shell border border-[var(--border-default)] cut-corners-sm">
				<div className="flex items-center gap-2 text-static">
					<Wifi size={16} />
					<span className="text-sm font-ui">Tailscale not installed</span>
				</div>
				<p className="text-xs text-static/70 mt-2 font-body">
					Install Tailscale to enable secure remote access to your OpenMotoko instance.
				</p>
			</div>
		)
	}

	return (
		<div className="space-y-3">
			<div className="p-4 bg-shell border border-[var(--border-default)] cut-corners-sm">
				<div className="flex items-center justify-between mb-3">
					<div className="flex items-center gap-2">
						<Wifi size={16} className="text-ghost" />
						<span className="text-sm font-ui font-semibold text-chrome">Tailscale</span>
					</div>
					<div className="flex items-center gap-1.5">
						<div className={`w-2 h-2 rounded-full ${status.online ? 'bg-alive' : 'bg-pulse'}`} />
						<span className="text-xs font-ui text-static">
							{status.online ? 'Connected' : 'Disconnected'}
						</span>
					</div>
				</div>

				<div className="space-y-2 text-xs font-body">
					{status.hostname && (
						<div className="flex justify-between">
							<span className="text-static">Hostname</span>
							<span className="text-chrome font-mono">{status.hostname}</span>
						</div>
					)}
					{status.magicDns && (
						<div className="flex justify-between">
							<span className="text-static">MagicDNS</span>
							<span className="text-ghost font-mono">{status.magicDns}</span>
						</div>
					)}
					{status.ipv4 && (
						<div className="flex justify-between">
							<span className="text-static">IPv4</span>
							<span className="text-chrome font-mono">{status.ipv4}</span>
						</div>
					)}
					{status.version && (
						<div className="flex justify-between">
							<span className="text-static">Version</span>
							<span className="text-static">{status.version}</span>
						</div>
					)}
				</div>
			</div>

			<div className="p-4 bg-shell border border-[var(--border-default)] cut-corners-sm">
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center gap-2">
						<Globe size={16} className="text-ghost" />
						<span className="text-sm font-ui font-semibold text-chrome">Tailscale Serve</span>
					</div>
					<button
						type="button"
						onClick={() => (status.serve.serving ? stopMutation.mutate() : startMutation.mutate())}
						disabled={startMutation.isPending || stopMutation.isPending}
						className={`flex items-center gap-1.5 px-3 py-1 text-xs font-ui transition-colors ${
							status.serve.serving
								? 'bg-pulse/20 text-pulse hover:bg-pulse/30 border border-[var(--pulse-border)]'
								: 'bg-alive/20 text-alive hover:bg-alive/30 border border-[var(--alive-border)]'
						}`}
					>
						{status.serve.serving ? (
							<>
								<PowerOff size={12} />
								Stop
							</>
						) : (
							<>
								<Power size={12} />
								Start
							</>
						)}
					</button>
				</div>

				{status.serve.serving && status.serve.url && (
					<p className="text-xs font-mono text-alive mt-1">{status.serve.url}</p>
				)}

				{!status.serve.serving && (
					<p className="text-xs text-static/70 font-body">
						Expose OpenMotoko via your Tailscale network
					</p>
				)}
			</div>

			<div className="p-4 bg-shell border border-[var(--border-default)] cut-corners-sm">
				<button
					type="button"
					onClick={() => setShowNodes(!showNodes)}
					className="flex items-center justify-between w-full"
				>
					<div className="flex items-center gap-2">
						<Monitor size={16} className="text-ghost" />
						<span className="text-sm font-ui font-semibold text-chrome">Network Nodes</span>
					</div>
					<RefreshCw
						size={14}
						className={`text-static transition-transform ${showNodes ? 'rotate-180' : ''}`}
					/>
				</button>

				{showNodes && nodes && (
					<div className="mt-3 space-y-2">
						{nodes.length === 0 ? (
							<p className="text-xs text-static/70 font-body">No other nodes found</p>
						) : (
							nodes.map((node) => (
								<div
									key={node.id}
									className="flex items-center justify-between py-1.5 border-t border-[var(--border-default)]"
								>
									<div className="flex items-center gap-2">
										<div
											className={`w-1.5 h-1.5 rounded-full ${node.online ? 'bg-alive' : 'bg-static'}`}
										/>
										<span className="text-xs font-mono text-chrome">{node.hostname}</span>
									</div>
									<span className="text-xs text-static">{node.os}</span>
								</div>
							))
						)}
					</div>
				)}
			</div>
		</div>
	)
}
