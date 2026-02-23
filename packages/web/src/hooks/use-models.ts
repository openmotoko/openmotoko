import { useCallback, useEffect, useState } from 'react'
import type { ModelsResponse, ProviderModels } from '../lib/api'
import { api } from '../lib/api'

let cachedData: ModelsResponse | null = null
let cacheExpiry = 0

export function useModels() {
	const [data, setData] = useState<ModelsResponse | null>(cachedData)
	const [loading, setLoading] = useState(!cachedData)
	const [error, setError] = useState<string | null>(null)

	const fetchModels = useCallback(async () => {
		if (cachedData && Date.now() < cacheExpiry) {
			setData(cachedData)
			setLoading(false)
			return
		}

		setLoading(true)
		try {
			const result = await api.getModels()
			cachedData = result
			cacheExpiry = Date.now() + 300_000
			setData(result)
			setError(null)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load models')
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchModels()
	}, [fetchModels])

	const getProviderModels = useCallback(
		(providerId: string): ProviderModels | undefined => {
			return data?.providers.find((p) => p.id === providerId)
		},
		[data],
	)

	return { data, loading, error, refetch: fetchModels, getProviderModels }
}

export function invalidateModelsCache() {
	cachedData = null
	cacheExpiry = 0
}
