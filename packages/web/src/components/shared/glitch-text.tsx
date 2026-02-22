import { useState } from 'react'

interface GlitchTextProps {
	text: string
	className?: string
	as?: 'span' | 'h1' | 'h2' | 'h3' | 'p'
	'aria-label'?: string
}

export function GlitchText({
	text,
	className = '',
	as: Tag = 'span',
	'aria-label': ariaLabel,
}: GlitchTextProps) {
	const [isHovered, setIsHovered] = useState(false)

	return (
		<Tag
			className={`relative inline-block ${className}`}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			data-text={text}
			aria-label={ariaLabel ?? text}
		>
			{text}
			{isHovered && (
				<>
					<span
						className="absolute top-0 left-0 w-full h-full text-pulse"
						style={{
							animation: 'glitch-clip-1 2s infinite linear alternate-reverse',
							clipPath: 'inset(20% 0 60% 0)',
							transform: 'translate(-2px)',
						}}
						aria-hidden="true"
					>
						{text}
					</span>
					<span
						className="absolute top-0 left-0 w-full h-full text-ghost"
						style={{
							animation: 'glitch-clip-2 2s infinite linear alternate-reverse',
							clipPath: 'inset(60% 0 10% 0)',
							transform: 'translate(2px)',
						}}
						aria-hidden="true"
					>
						{text}
					</span>
				</>
			)}
		</Tag>
	)
}
