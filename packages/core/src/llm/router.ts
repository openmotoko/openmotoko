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

		for (const providerId of this.providerOrder) {
			const provider = this.providers.get(providerId)!
			if (
				model.startsWith('claude') || model.startsWith('anthropic')
					? provider.id === 'anthropic'
					: model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')
						? provider.id === 'openai'
						: model.startsWith('gemini')
							? provider.id === 'google'
							: provider.id === 'ollama'
			) {
				return { provider, model }
			}
		}

		const fallback = this.providers.get(this.providerOrder[0])
		if (!fallback) {
			throw new Error(`No provider available for model "${model}"`)
		}
		return { provider: fallback, model }
	}

	private getFallbackProviders(excludeId: string): LLMProvider[] {
		return this.providerOrder
			.filter((id) => id !== excludeId)
			.map((id) => this.providers.get(id)!)
			.filter(Boolean)
	}

	async chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
		const { provider, model } = this.resolveProvider(config.model)
		const resolvedConfig = { ...config, model }

		try {
			return await this.chatWithRetry(provider, messages, resolvedConfig)
		} catch (error) {
			for (const fallback of this.getFallbackProviders(provider.id)) {
				try {
					return await this.chatWithRetry(fallback, messages, resolvedConfig)
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
					yield* this.streamWithRetry(fallback, messages, resolvedConfig)
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
		return this.providerOrder.map((id) => this.providers.get(id)!).filter(Boolean)
	}
}
