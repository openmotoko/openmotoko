import { Download, Package, Shield, Star } from 'lucide-react'
import { useState } from 'react'
import { RatingDialog } from './rating-dialog'

interface SkillCardProps {
	id: string
	name: string
	description: string
	author: string
	version: string
	downloads: number
	rating: number
	ratingCount: number
	verified: boolean
	securityStatus: string
	tags: string[]
	onInstall: (id: string) => void
	onRate: (id: string, stars: number, comment: string) => void
}

export function SkillCard({
	id,
	name,
	description,
	author,
	version,
	downloads,
	rating,
	ratingCount,
	verified,
	securityStatus,
	tags,
	onInstall,
	onRate,
}: SkillCardProps) {
	const [showRating, setShowRating] = useState(false)

	return (
		<div className="bg-shell border border-(--border-default) p-4 clip-corner-sm hover:border-ghost/30 transition-colors">
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-center gap-2 min-w-0">
					<Package className="w-4 h-4 text-ghost shrink-0" />
					<h3 className="text-sm font-ui text-chrome truncate">{name}</h3>
					{verified && (
						<span className="px-1.5 py-0.5 text-[10px] font-ui bg-alive/10 text-alive border border-alive/30 shrink-0">
							VERIFIED
						</span>
					)}
				</div>
				<span className="text-[10px] font-ui text-static shrink-0">v{version}</span>
			</div>

			<p className="mt-2 text-xs text-static line-clamp-2 font-ui">{description}</p>
			<p className="mt-1 text-[10px] text-static/60 font-ui">by {author}</p>

			{tags.length > 0 && (
				<div className="flex flex-wrap gap-1 mt-2">
					{tags.map((tag) => (
						<span
							key={tag}
							className="px-1.5 py-0.5 text-[10px] font-ui bg-void text-static border border-(--border-default)"
						>
							{tag}
						</span>
					))}
				</div>
			)}

			<div className="flex items-center justify-between mt-3 pt-3 border-t border-(--border-default)">
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => setShowRating(true)}
						className="flex items-center gap-1 text-[10px] font-ui text-static hover:text-ghost transition-colors"
					>
						<Star className="w-3 h-3" />
						{rating > 0 ? rating.toFixed(1) : '--'}
						<span className="text-static/40">({ratingCount})</span>
					</button>

					<span className="flex items-center gap-1 text-[10px] font-ui text-static">
						<Download className="w-3 h-3" />
						{downloads}
					</span>

					<span className="flex items-center gap-1 text-[10px] font-ui">
						<Shield
							className={`w-3 h-3 ${
								securityStatus === 'passed'
									? 'text-alive'
									: securityStatus === 'failed'
										? 'text-pulse'
										: 'text-static'
							}`}
						/>
						<span
							className={
								securityStatus === 'passed'
									? 'text-alive'
									: securityStatus === 'failed'
										? 'text-pulse'
										: 'text-static'
							}
						>
							{securityStatus.toUpperCase()}
						</span>
					</span>
				</div>

				<button
					type="button"
					onClick={() => onInstall(id)}
					className="px-3 py-1 text-[10px] font-ui bg-ghost/10 text-ghost border border-ghost/30 hover:bg-ghost/20 transition-colors clip-corner-xs"
				>
					INSTALL
				</button>
			</div>

			{showRating && (
				<RatingDialog
					skillId={id}
					skillName={name}
					onRate={(stars: number, comment: string) => {
						onRate(id, stars, comment)
						setShowRating(false)
					}}
					onClose={() => setShowRating(false)}
				/>
			)}
		</div>
	)
}
