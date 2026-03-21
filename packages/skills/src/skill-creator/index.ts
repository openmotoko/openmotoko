import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

const SKILLS_DIR = join(homedir(), '.openmotoko', 'skills')

const FORBIDDEN_PATTERNS = [
	/\beval\s*\(/,
	/\bnew\s+Function\s*\(/,
	/\brequire\s*\(/,
	/\bprocess\.exit\s*\(/,
	/\bchild_process\b/,
	/\bexecSync\b/,
	/\bexecFile\b/,
	/\bspawn\b/,
]

interface ToolParam {
	name: string
	type: string
	description: string
	required?: boolean
}

interface ToolDef {
	name: string
	description: string
	parameters?: Record<string, ToolParam>
}

interface SkillTemplate {
	id: string
	name: string
	description: string
	capabilities: Record<string, unknown>
	sampleTools: string[]
}

const TEMPLATES: SkillTemplate[] = [
	{
		id: 'basic',
		name: 'Basic Skill',
		description:
			'A simple skill with no special capabilities, suitable for pure computation or text processing',
		capabilities: {},
		sampleTools: ['process_input'],
	},
	{
		id: 'api-integration',
		name: 'API Integration',
		description:
			'A skill that integrates with an external REST API, includes network access and environment variables for auth',
		capabilities: { network: true, env: ['API_KEY'] },
		sampleTools: ['api_get', 'api_post'],
	},
	{
		id: 'file-processor',
		name: 'File Processor',
		description: 'A skill that reads, transforms, and writes files on the local filesystem',
		capabilities: { filesystem: { enabled: true, paths: [] } },
		sampleTools: ['read_file', 'transform_file', 'write_file'],
	},
	{
		id: 'data-transformer',
		name: 'Data Transformer',
		description: 'A skill for transforming data between formats (JSON, CSV, XML, etc.)',
		capabilities: {},
		sampleTools: ['transform', 'validate_schema'],
	},
]

function toSkillId(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
}

function buildInputSchema(params?: Record<string, ToolParam>): Record<string, unknown> {
	if (!params || Object.keys(params).length === 0) {
		return { type: 'object', properties: {} }
	}

	const properties: Record<string, unknown> = {}
	const required: string[] = []

	for (const [key, param] of Object.entries(params)) {
		properties[key] = {
			type: param.type || 'string',
			description: param.description || key,
		}
		if (param.required !== false) {
			required.push(key)
		}
	}

	return {
		type: 'object',
		properties,
		...(required.length > 0 ? { required } : {}),
	}
}

function generateManifest(
	id: string,
	name: string,
	description: string,
	tools: ToolDef[],
	capabilities?: Record<string, unknown>,
): Record<string, unknown> {
	return {
		id,
		name,
		version: '0.1.0',
		description,
		author: 'openmotoko',
		capabilities: capabilities ?? {},
		tools: tools.map((t) => ({
			name: t.name,
			description: t.description,
			inputSchema: buildInputSchema(t.parameters as Record<string, ToolParam> | undefined),
		})),
	}
}

function generateHandlerCode(id: string, tools: ToolDef[]): string {
	const cases = tools
		.map((t) => {
			const paramLines = t.parameters
				? Object.entries(t.parameters)
						.map(([key, param]) => {
							const p = param as ToolParam
							const tsType =
								p.type === 'number' ? 'number' : p.type === 'boolean' ? 'boolean' : 'string'
							return `\t\t\tconst ${key} = args.${key} as ${tsType}`
						})
						.join('\n')
				: ''
			return `\t\tcase '${t.name}': {\n${paramLines}\n\t\t\tctx.log(\`Executing ${t.name}\`)\n\t\t\treturn { success: true, data: { message: '${t.name} executed', args } }\n\t\t}`
		})
		.join('\n\n')

	return `import { readFile } from 'node:fs/promises'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
\tawait readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

export const ${id.replace(/-/g, '_')} = defineSkill(manifest, async (toolName, args, ctx) => {
\tswitch (toolName) {
${cases}

\t\tdefault:
\t\t\treturn { success: false, error: \`Unknown tool: \${toolName}\` }
\t}
})
`
}

function scanForForbiddenPatterns(code: string): string[] {
	const violations: string[] = []
	for (const pattern of FORBIDDEN_PATTERNS) {
		if (pattern.test(code)) {
			violations.push(`Forbidden pattern detected: ${pattern.source}`)
		}
	}
	return violations
}

function validateManifestStructure(data: unknown): string[] {
	const errors: string[] = []
	if (typeof data !== 'object' || data === null) {
		return ['Manifest must be a JSON object']
	}
	const obj = data as Record<string, unknown>
	if (typeof obj.id !== 'string' || obj.id.length === 0) {
		errors.push('Manifest must have a non-empty "id" field')
	}
	if (typeof obj.name !== 'string' || obj.name.length === 0) {
		errors.push('Manifest must have a non-empty "name" field')
	}
	if (typeof obj.version !== 'string') {
		errors.push('Manifest must have a "version" field')
	}
	if (!Array.isArray(obj.tools) || obj.tools.length === 0) {
		errors.push('Manifest must have a non-empty "tools" array')
	} else {
		for (const tool of obj.tools as Record<string, unknown>[]) {
			if (typeof tool.name !== 'string') {
				errors.push('Each tool must have a "name" string')
			}
			if (typeof tool.description !== 'string') {
				errors.push(`Tool "${tool.name}" must have a "description" string`)
			}
		}
	}
	return errors
}

export const skillCreator = defineSkill(manifest, async (toolName, args, ctx) => {
	switch (toolName) {
		case 'create_skill': {
			const name = args.name as string
			const description = args.description as string
			const tools = (args.tools as ToolDef[]) ?? []
			const capabilities = args.capabilities as Record<string, unknown> | undefined

			if (!name || !description) {
				return { success: false, error: 'Name and description are required' }
			}
			if (tools.length === 0) {
				return { success: false, error: 'At least one tool definition is required' }
			}

			const id = toSkillId(name)
			ctx.log(`Creating skill: ${id}`)

			try {
				const manifestData = generateManifest(id, name, description, tools, capabilities)
				const handlerCode = generateHandlerCode(id, tools)

				const violations = scanForForbiddenPatterns(handlerCode)
				if (violations.length > 0) {
					return {
						success: false,
						error: `Generated code contains forbidden patterns: ${violations.join(', ')}`,
					}
				}

				const skillDir = join(SKILLS_DIR, id)
				await mkdir(skillDir, { recursive: true })

				await writeFile(
					join(skillDir, 'manifest.json'),
					JSON.stringify(manifestData, null, '\t'),
					'utf-8',
				)
				await writeFile(join(skillDir, 'index.ts'), handlerCode, 'utf-8')

				return {
					success: true,
					data: {
						id,
						path: skillDir,
						files: ['manifest.json', 'index.ts'],
					},
				}
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'list_templates': {
			ctx.log('Listing skill templates')
			return {
				success: true,
				data: {
					templates: TEMPLATES.map((t) => ({
						id: t.id,
						name: t.name,
						description: t.description,
						capabilities: t.capabilities,
						sampleTools: t.sampleTools,
					})),
				},
			}
		}

		case 'validate_skill': {
			const path = args.path as string
			if (!path) {
				return { success: false, error: 'Path is required' }
			}

			ctx.log(`Validating skill at: ${path}`)
			const errors: string[] = []
			const warnings: string[] = []

			try {
				const manifestPath = join(path, 'manifest.json')
				let manifestRaw: string
				try {
					manifestRaw = await readFile(manifestPath, 'utf-8')
				} catch {
					return { success: false, error: 'Cannot read manifest.json - file not found' }
				}

				let manifestData: unknown
				try {
					manifestData = JSON.parse(manifestRaw)
				} catch {
					return { success: false, error: 'manifest.json is not valid JSON' }
				}

				const manifestErrors = validateManifestStructure(manifestData)
				errors.push(...manifestErrors)

				const indexPath = join(path, 'index.ts')
				let indexCode: string
				try {
					indexCode = await readFile(indexPath, 'utf-8')
				} catch {
					errors.push('index.ts not found')
					return {
						success: false,
						data: { valid: false, errors, warnings },
					}
				}

				const codeViolations = scanForForbiddenPatterns(indexCode)
				for (const v of codeViolations) {
					errors.push(v)
				}

				if (!indexCode.includes('defineSkill')) {
					warnings.push('index.ts does not appear to use defineSkill()')
				}
				if (!indexCode.includes('import')) {
					warnings.push('index.ts has no import statements')
				}

				const valid = errors.length === 0
				return {
					success: true,
					data: { valid, errors, warnings },
				}
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		default:
			return { success: false, error: `Unknown tool: ${toolName}` }
	}
})
