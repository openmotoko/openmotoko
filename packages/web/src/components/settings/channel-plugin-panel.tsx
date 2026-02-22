import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plug, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../lib/api'

interface ChannelPluginInfo {
	id: string
	name: string
	version: string
	packageName: string
	installed: boolean
}

export function ChannelPluginPanel() {
	const queryClient = useQueryClient()
	const [newPackage, setNewPackage] = useState('')

	const { data: plugins = [], isLoading } = useQuery({
		queryKey: ['channel-plugins'],
		queryFn: () => api.getChannelPlugins(),
		refetchInterval: 30_000,
	})

	const installMutation = useMutation({
		mutationFn: (packageName: string) => api.installChannelPlugin(packageName),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['channel-plugins'] })
			setNewPackage('')
		},
	})

	const uninstallMutation = useMutation({
		mutationFn: (pluginId: string) => api.uninstallChannelPlugin(pluginId),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channel-plugins'] }),
	})

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<Plug className="w-4 h-4 text-ghost" />
				<h3 className="text-sm font-ui text-chrome">Channel Plugins</h3>
			</div>

			<div className="flex gap-2">
				<input
					type="text"
					value={newPackage}
					onChange={(e) => setNewPackage(e.target.value)}
					placeholder="npm package name"
					className="flex-1 px-3 py-1.5 text-xs font-ui bg-void border border-(--border-default) text-chrome placeholder:text-static/40 focus:outline-none focus:border-ghost/50"
				/>
				<button
					type="button"
					onClick={() => newPackage && installMutation.mutate(newPackage)}
					disabled={!newPackage || installMutation.isPending}
					className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-ui bg-ghost/10 text-ghost border border-ghost/30 hover:bg-ghost/20 transition-colors disabled:opacity-30 clip-corner-xs"
				>
					<Plus className="w-3 h-3" />
					INSTALL
				</button>
			</div>

			{installMutation.isError && (
				<p className="text-[10px] font-ui text-pulse">
					{installMutation.error instanceof Error
						? installMutation.error.message
						: 'Installation fehlgeschlagen'}
				</p>
			)}

			{isLoading ? (
				<div className="space-y-2">
					<div key="skel-a" className="h-12 bg-void/50 animate-pulse" />
					<div key="skel-b" className="h-12 bg-void/50 animate-pulse" />
				</div>
			) : (plugins as ChannelPluginInfo[]).length === 0 ? (
				<p className="text-xs font-ui text-static/50 py-4 text-center">
					Keine Channel Plugins installiert
				</p>
			) : (
				<div className="space-y-2">
					{(plugins as ChannelPluginInfo[]).map((plugin) => (
						<div
							key={plugin.id}
							className="flex items-center justify-between p-3 bg-void/30 border border-(--border-default)"
						>
							<div className="flex items-center gap-3">
								<Plug className="w-3.5 h-3.5 text-ghost" />
								<div>
									<p className="text-xs font-ui text-chrome">{plugin.name}</p>
									<p className="text-[10px] font-ui text-static">
										{plugin.packageName} v{plugin.version}
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => uninstallMutation.mutate(plugin.id)}
								className="text-static hover:text-pulse transition-colors"
							>
								<Trash2 className="w-3.5 h-3.5" />
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
