import { McpServer as SdkMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { ToolDefinition } from '../llm/types.js'

type ToolExecutor = (toolName: string, input: unknown) => Promise<string>

export class McpServer {
	private server: SdkMcpServer
	private executor: ToolExecutor | null = null
	private registeredToolNames = new Set<string>()

	constructor() {
		this.server = new SdkMcpServer(
			{ name: 'openmotoko', version: '0.1.0' },
			{ capabilities: { tools: {} } },
		)
	}

	setTools(tools: ToolDefinition[]): void {
		for (const t of tools) {
			if (this.registeredToolNames.has(t.name)) continue

			this.server.registerTool(
				t.name,
				{
					description: t.description,
				},
				async (extra: Record<string, unknown>) => {
					if (!this.executor) {
						return {
							content: [{ type: 'text' as const, text: 'No executor configured' }],
							isError: true,
						}
					}

					try {
						const result = await this.executor(t.name, extra)
						return { content: [{ type: 'text' as const, text: result }] }
					} catch (err) {
						return {
							content: [
								{ type: 'text' as const, text: err instanceof Error ? err.message : String(err) },
							],
							isError: true,
						}
					}
				},
			)
			this.registeredToolNames.add(t.name)
		}
	}

	setExecutor(executor: ToolExecutor): void {
		this.executor = executor
	}

	async startStdio(): Promise<void> {
		const transport = new StdioServerTransport()
		await this.server.connect(transport)
	}

	async close(): Promise<void> {
		await this.server.close()
	}
}
