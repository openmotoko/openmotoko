import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ZodType } from 'zod'

interface ValidationSchema {
	body?: ZodType
	params?: ZodType
	query?: ZodType
}

export function validate(schema: ValidationSchema) {
	return async (request: FastifyRequest, reply: FastifyReply) => {
		const errors: Array<{ field: string; path: string; message: string }> = []

		if (schema.body) {
			const result = schema.body.safeParse(request.body)
			if (!result.success) {
				for (const issue of result.error.issues) {
					errors.push({
						field: 'body',
						path: issue.path.join('.'),
						message: issue.message,
					})
				}
			} else {
				request.body = result.data
			}
		}

		if (schema.params) {
			const result = schema.params.safeParse(request.params)
			if (!result.success) {
				for (const issue of result.error.issues) {
					errors.push({
						field: 'params',
						path: issue.path.join('.'),
						message: issue.message,
					})
				}
			}
		}

		if (schema.query) {
			const result = schema.query.safeParse(request.query)
			if (!result.success) {
				for (const issue of result.error.issues) {
					errors.push({
						field: 'query',
						path: issue.path.join('.'),
						message: issue.message,
					})
				}
			}
		}

		if (errors.length > 0) {
			return reply.status(400).send({
				error: 'Validation failed',
				code: 'VALIDATION_ERROR',
				details: errors,
			})
		}
	}
}
