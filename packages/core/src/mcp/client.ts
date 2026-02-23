import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { McpConfig } from '../config/schema.js'
import type { ToolDefinition } from '../llm/types.js'

interface McpServerConnection {
	id: string
	client: Client
	tools: ToolDefinition[]
}

export class McpClientManager {
	private connections = new Map<string, McpServerConnection>()

	async connectAll(config: McpConfig): Promise<void> {
		for (const server of config.servers) {
			try {
				await this.connect(server)
			} catch (err) {
				console.error(
					`MCP connect failed for ${server.id}:`,
					err instanceof Error ? err.message : err,
				)
			}
		}
	}

	private async connect(server: McpConfig['servers'][number]): Promise<void> {
		const client = new Client({ name: 'openmotoko', version: '0.1.0' }, { capabilities: {} })

		let transport: StdioClientTransport | StreamableHTTPClientTransport
		if (server.transport === 'stdio' && server.command) {
			transport = new StdioClientTransport({
				command: server.command,
				args: server.args ?? [],
				env: server.env as Record<string, string> | undefined,
			})
		} else if (server.transport === 'http' && server.url) {
			transport = new StreamableHTTPClientTransport(new URL(server.url))
		} else {
			throw new Error(`Invalid MCP server config for ${server.id}`)
		}

		await client.connect(transport)

		const { tools: mcpTools } = await client.listTools()

		const tools: ToolDefinition[] = mcpTools.map((t) => ({
			name: `mcp_${server.id}_${t.name}`,
			description: `[MCP:${server.name ?? server.id}] ${t.description ?? t.name}`,
			inputSchema: (t.inputSchema ?? { type: 'object', properties: {} }) as Record<string, unknown>,
		}))

		this.connections.set(server.id, { id: server.id, client, tools })
	}

	getTools(): ToolDefinition[] {
		const all: ToolDefinition[] = []
		for (const conn of this.connections.values()) {
			all.push(...conn.tools)
		}
		return all
	}

	async callTool(prefixedName: string, args: unknown): Promise<unknown> {
		const parts = prefixedName.replace(/^mcp_/, '').split('_')
		const serverId = parts[0]
		const toolName = parts.slice(1).join('_')

		const conn = this.connections.get(serverId)
		if (!conn) throw new Error(`MCP server ${serverId} not connected`)

		const result = await conn.client.callTool({
			name: toolName,
			arguments: args as Record<string, unknown>,
		})

		if (result && 'content' in result && Array.isArray(result.content)) {
			return result.content.map((c: { type: string; text?: string }) => c.text ?? '').join('\n')
		}

		return JSON.stringify(result)
	}

	isMcpTool(toolName: string): boolean {
		return toolName.startsWith('mcp_')
	}

	async disconnectAll(): Promise<void> {
		for (const conn of this.connections.values()) {
			try {
				await conn.client.close()
			} catch {}
		}
		this.connections.clear()
	}

	getConnectionIds(): string[] {
		return [...this.connections.keys()]
	}
}
