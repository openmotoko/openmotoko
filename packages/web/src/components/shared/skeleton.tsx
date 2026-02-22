interface SkeletonProps {
	className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
	return <div className={`bg-panel animate-pulse rounded ${className}`} />
}

const CONV_KEYS = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7']
const MSG_KEYS = ['m0', 'm1', 'm2', 'm3', 'm4']
const SKILL_KEYS = ['s0', 's1', 's2', 's3', 's4', 's5']
const ACT_KEYS = ['a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9']

export function ConversationListSkeleton() {
	return (
		<div className="space-y-1 p-2">
			{CONV_KEYS.map((key) => (
				<div key={key} className="flex items-center gap-2 px-3 py-2">
					<Skeleton className="w-8 h-8 rounded shrink-0" />
					<div className="flex-1 space-y-1.5">
						<Skeleton className="h-3 w-3/4" />
						<Skeleton className="h-2 w-1/2" />
					</div>
				</div>
			))}
		</div>
	)
}

export function MessageListSkeleton() {
	return (
		<div className="space-y-4 p-4">
			{MSG_KEYS.map((key, i) => (
				<div key={key} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
					<div className={`space-y-1.5 ${i % 2 === 0 ? 'max-w-[60%]' : 'max-w-[70%]'}`}>
						<Skeleton className={`h-4 ${i % 2 === 0 ? 'w-48' : 'w-64'}`} />
						<Skeleton className={`h-4 ${i % 2 === 0 ? 'w-32' : 'w-56'}`} />
						{i % 2 !== 0 && <Skeleton className="h-4 w-40" />}
					</div>
				</div>
			))}
		</div>
	)
}

export function SkillListSkeleton() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
			{SKILL_KEYS.map((key) => (
				<div
					key={key}
					className="p-4 bg-shell border border-(--border-default) cut-corners-sm space-y-3"
				>
					<div className="flex items-center gap-2">
						<Skeleton className="w-8 h-8 rounded" />
						<Skeleton className="h-4 w-24" />
					</div>
					<Skeleton className="h-3 w-full" />
					<Skeleton className="h-3 w-3/4" />
				</div>
			))}
		</div>
	)
}

export function ActivitySkeleton() {
	return (
		<div className="space-y-2 p-4">
			{ACT_KEYS.map((key) => (
				<div key={key} className="flex items-start gap-3 py-2">
					<Skeleton className="w-6 h-6 rounded-full shrink-0" />
					<div className="flex-1 space-y-1.5">
						<Skeleton className="h-3 w-48" />
						<Skeleton className="h-2 w-24" />
					</div>
				</div>
			))}
		</div>
	)
}
