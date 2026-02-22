import * as Dialog from '@radix-ui/react-dialog'
import { Star, X } from 'lucide-react'
import { useState } from 'react'

interface RatingDialogProps {
	skillId: string
	skillName: string
	onRate: (stars: number, comment: string) => void
	onClose: () => void
}

export function RatingDialog({ skillName, onRate, onClose }: RatingDialogProps) {
	const [stars, setStars] = useState(0)
	const [hover, setHover] = useState(0)
	const [comment, setComment] = useState('')

	return (
		<Dialog.Root open onOpenChange={(open) => !open && onClose()}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-void/80 backdrop-blur-sm z-50" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-shell border border-(--border-default) p-6 clip-corner-sm">
					<div className="flex items-center justify-between mb-4">
						<Dialog.Title className="text-sm font-ui text-chrome">
							Bewertung: {skillName}
						</Dialog.Title>
						<Dialog.Close asChild>
							<button type="button" className="text-static hover:text-chrome">
								<X className="w-4 h-4" />
							</button>
						</Dialog.Close>
					</div>

					<div className="flex items-center gap-1 mb-4">
						{[1, 2, 3, 4, 5].map((n) => (
							<button
								key={n}
								type="button"
								onMouseEnter={() => setHover(n)}
								onMouseLeave={() => setHover(0)}
								onClick={() => setStars(n)}
								className="p-1"
							>
								<Star
									className={`w-6 h-6 transition-colors ${
										n <= (hover || stars) ? 'text-ghost fill-ghost' : 'text-static/30'
									}`}
								/>
							</button>
						))}
						{stars > 0 && <span className="ml-2 text-xs font-ui text-static">{stars}/5</span>}
					</div>

					<textarea
						value={comment}
						onChange={(e) => setComment(e.target.value)}
						placeholder="Kommentar (optional)"
						className="w-full h-20 px-3 py-2 text-xs font-ui bg-void border border-(--border-default) text-chrome placeholder:text-static/40 resize-none focus:outline-none focus:border-ghost/50"
					/>

					<div className="flex justify-end gap-2 mt-4">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-1.5 text-[10px] font-ui text-static border border-(--border-default) hover:text-chrome transition-colors"
						>
							ABBRECHEN
						</button>
						<button
							type="button"
							onClick={() => stars > 0 && onRate(stars, comment)}
							disabled={stars === 0}
							className="px-4 py-1.5 text-[10px] font-ui bg-ghost/10 text-ghost border border-ghost/30 hover:bg-ghost/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed clip-corner-xs"
						>
							BEWERTEN
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
