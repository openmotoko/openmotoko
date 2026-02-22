import type { z } from 'zod'
import type { ToolResult } from './types.js'

export function parseJsonInput<T>(raw: unknown, schema: z.ZodType<T>): T {
	return schema.parse(raw)
}

export function formatToolResult(data: unknown): ToolResult {
	return { success: true, data }
}

export function formatError(err: unknown): ToolResult {
	const message = err instanceof Error ? err.message : String(err)
	return { success: false, error: message }
}

export function validateInput<T>(
	schema: z.ZodType<T>,
	data: unknown,
): { ok: true; data: T } | { ok: false; error: string } {
	const result = schema.safeParse(data)
	if (result.success) return { ok: true, data: result.data }
	return { ok: false, error: result.error.message }
}
