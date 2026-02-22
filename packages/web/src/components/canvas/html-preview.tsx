import { useEffect, useRef } from 'react'

interface HtmlPreviewProps {
	content: string
	title: string
}

export function HtmlPreview({ content, title }: HtmlPreviewProps) {
	const iframeRef = useRef<HTMLIFrameElement>(null)

	useEffect(() => {
		const iframe = iframeRef.current
		if (!iframe) return
		const doc = iframe.contentDocument
		if (!doc) return
		doc.open()
		doc.write(content)
		doc.close()
	}, [content])

	return (
		<div className="bg-shell border border-(--border-default) cut-corners-sm overflow-hidden">
			<div className="flex items-center px-4 py-2 border-b border-(--border-default) bg-panel/50">
				<span className="text-xs font-ui text-chrome">{title}</span>
				<span className="text-xs text-static/40 ml-auto">HTML Preview</span>
			</div>
			<iframe
				ref={iframeRef}
				title={title}
				sandbox="allow-scripts"
				className="w-full h-[calc(100vh-200px)] bg-white"
			/>
		</div>
	)
}
