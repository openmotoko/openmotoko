import type {
	LLMChunk,
	LLMConfig,
	LLMMessage,
	LLMProvider,
	LLMResponse,
	ModelAlias,
} from './types.js'

export interface RouterConfig {
	providers: LLMProvider[]
	modelAliases: Record<ModelAlias, { provider: string; model: string }>
	maxRetries?: number
	initialRetryDelayMs?: number
}

interface ResolvedModel {
	provider: LLMProvider
	model: string
}

function isRateLimitError(error: unknown): boolean {
	if (error instanceof Error) {
		const msg = error.message.toLowerCase()
		if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many requests')) {
			return true
		}
	}
	if (typeof error === 'object' && error !== null && 'status' in error) {
		return (error as { status: number }).status === 429
	}
	return false
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export class LLMRouter {
	private providers: Map<string, LLMProvider>
	private providerOrder: string[]
	private modelAliases: Record<ModelAlias, { provider: string; model: string }>
	private maxRetries: number
	private initialRetryDelayMs: number

	constructor(config: RouterConfig) {
		this.providers = new Map(config.providers.map((p) => [p.id, p]))
		this.providerOrder = config.providers.map((p) => p.id)
		this.modelAliases = config.modelAliases
		this.maxRetries = config.maxRetries ?? 3
		this.initialRetryDelayMs = config.initialRetryDelayMs ?? 1000
	}

	resolveModel(alias: ModelAlias): ResolvedModel {
		const mapping = this.modelAliases[alias]
		const provider = this.providers.get(mapping.provider)
		if (!provider) {
			throw new Error(`Provider "${mapping.provider}" not found for alias "${alias}"`)
		}
		return { provider, model: mapping.model }
	}

	private resolveProvider(model: string): ResolvedModel {
		if (model in this.modelAliases) {
			return this.resolveModel(model as ModelAlias)
		}

		const providerByPrefix = (id: string): string | null => {
			if (id.startsWith('claude') || id.startsWith('anthropic')) return 'anthropic'
			if (
				id.startsWith('gpt') ||
				id.startsWith('o1') ||
				id.startsWith('o3') ||
				id.startsWith('o4') ||
				id.startsWith('chatgpt')
			)
				return 'openai'
			if (id.startsWith('gemini')) return 'google'
			return null
		}

		const targetProvider = providerByPrefix(model)
		if (targetProvider) {
			const provider = this.providers.get(targetProvider)
			if (provider) return { provider, model }
		}

		for (const providerId of this.providerOrder) {
			const provider = this.providers.get(providerId)
			if (!provider) continue
			if (provider.id === 'ollama') return { provider, model }
		}

		const fallback = this.providers.get(this.providerOrder[0])
		if (!fallback) {
			throw new Error(`No provider available for model "${model}"`)
		}
		return { provider: fallback, model }
	}

	private pickFallbackModel(fallback: LLMProvider, originalAlias: string): string {
		const FALLBACK_DEFAULTS: Record<string, Record<string, string>> = {
			openai: { fast: 'gpt-5-mini', smart: 'gpt-5.2', balanced: 'gpt-5-mini' },
			google: { fast: 'gemini-2.5-flash', smart: 'gemini-2.5-pro', balanced: 'gemini-2.5-flash' },
			anthropic: {
				fast: 'claude-haiku-4-5',
				smart: 'claude-opus-4-6',
				balanced: 'claude-sonnet-4-6',
			},
		}
		const providerDefaults = FALLBACK_DEFAULTS[fallback.id]
		if (providerDefaults?.[originalAlias]) return providerDefaults[originalAlias]
		if (providerDefaults) return Object.values(providerDefaults)[1]
		return originalAlias
	}

	private getFallbackProviders(excludeId: string): LLMProvider[] {
		return this.providerOrder
			.filter((id) => id !== excludeId)
			.map((id) => this.providers.get(id))
			.filter((p): p is LLMProvider => p != null)
	}

	async chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
		const { provider, model } = this.resolveProvider(config.model)
		const resolvedConfig = { ...config, model }

		try {
			return await this.chatWithRetry(provider, messages, resolvedConfig)
		} catch (error) {
			for (const fallback of this.getFallbackProviders(provider.id)) {
				try {
					const fallbackModel = this.pickFallbackModel(fallback, config.model)
					return await this.chatWithRetry(fallback, messages, { ...config, model: fallbackModel })
				} catch {}
			}
			throw error
		}
	}

	private async chatWithRetry(
		provider: LLMProvider,
		messages: LLMMessage[],
		config: LLMConfig,
	): Promise<LLMResponse> {
		let lastError: unknown
		let delay = this.initialRetryDelayMs

		for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
			try {
				return await provider.chat(messages, config)
			} catch (error) {
				lastError = error
				if (isRateLimitError(error) && attempt < this.maxRetries) {
					await sleep(delay)
					delay *= 2
					continue
				}
				throw error
			}
		}

		throw lastError
	}

	async *stream(messages: LLMMessage[], config: LLMConfig): AsyncIterableIterator<LLMChunk> {
		const { provider, model } = this.resolveProvider(config.model)
		const resolvedConfig = { ...config, model }

		try {
			yield* this.streamWithRetry(provider, messages, resolvedConfig)
		} catch (error) {
			for (const fallback of this.getFallbackProviders(provider.id)) {
				try {
					const fallbackModel = this.pickFallbackModel(fallback, config.model)
					yield* this.streamWithRetry(fallback, messages, { ...config, model: fallbackModel })
					return
				} catch {}
			}
			throw error
		}
	}

	private async *streamWithRetry(
		provider: LLMProvider,
		messages: LLMMessage[],
		config: LLMConfig,
	): AsyncIterableIterator<LLMChunk> {
		let lastError: unknown
		let delay = this.initialRetryDelayMs

		for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
			try {
				yield* provider.stream(messages, config)
				return
			} catch (error) {
				lastError = error
				if (isRateLimitError(error) && attempt < this.maxRetries) {
					await sleep(delay)
					delay *= 2
					continue
				}
				throw error
			}
		}

		throw lastError
	}

	getProvider(id: string): LLMProvider | undefined {
		return this.providers.get(id)
	}

	listProviders(): LLMProvider[] {
		return this.providerOrder
			.map((id) => this.providers.get(id))
			.filter((p): p is LLMProvider => p != null)
	}
}
