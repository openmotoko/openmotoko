import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
	children: ReactNode
	fallback?: ReactNode
}

interface State {
	hasError: boolean
	error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = { hasError: false, error: null }
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error('[ErrorBoundary]', error, info.componentStack)
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) return this.props.fallback

			return (
				<div className="flex flex-col items-center justify-center h-full p-8 bg-void">
					<div className="flex flex-col items-center gap-4 max-w-md text-center">
						<div className="w-12 h-12 flex items-center justify-center bg-pulse/10 border border-(--pulse-border) cut-hex">
							<AlertTriangle size={24} className="text-pulse" />
						</div>
						<h2 className="text-lg font-display font-bold text-chrome">Something went wrong</h2>
						<p className="text-sm font-body text-static">
							{this.state.error?.message ?? 'An unexpected error occurred'}
						</p>
						<button
							type="button"
							onClick={() => {
								this.setState({ hasError: false, error: null })
								window.location.reload()
							}}
							className="flex items-center gap-2 px-4 py-2 bg-ghost text-void font-ui text-sm font-semibold cut-tr-sm hover:bg-ghost-hover transition-colors"
						>
							<RefreshCw size={14} />
							Reload
						</button>
					</div>
				</div>
			)
		}

		return this.props.children
	}
}
