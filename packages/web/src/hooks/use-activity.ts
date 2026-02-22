import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

interface ActivityFilters {
	channel?: string
	skillId?: string
	type?: string
	limit?: number
	offset?: number
}

export function useActivity(filters?: ActivityFilters) {
	return useQuery({
		queryKey: ['activity', filters],
		queryFn: () => api.getActivity(filters),
		refetchInterval: 10000,
	})
}
