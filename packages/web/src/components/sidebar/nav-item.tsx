import type { LucideIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router'

interface NavItemProps {
	to: string
	label: string
	icon: LucideIcon
}

export function NavItem({ to, label, icon: Icon }: NavItemProps) {
	const location = useLocation()
	const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`)

	return (
		<Link
			to={to}
			className={`
				flex items-center gap-3 px-4 py-2.5 font-ui text-sm transition-all relative group
				${
					isActive
						? 'text-ghost bg-ghost-muted'
						: 'text-static hover:text-chrome hover:bg-[rgba(74,96,112,0.08)]'
				}
			`}
		>
			{isActive && (
				<div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-ghost shadow-[0_0_8px_var(--ghost)]" />
			)}
			<Icon size={16} strokeWidth={isActive ? 2.5 : 1.5} />
			<span className="font-medium">{label}</span>
		</Link>
	)
}
