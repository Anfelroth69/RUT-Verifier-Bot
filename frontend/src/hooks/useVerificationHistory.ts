import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { HistoryItem } from '../types'

const STORAGE_KEY = 'rutHistory'
const MAX_ITEMS = 10

function getHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as HistoryItem[]
  } catch {
    return []
  }
}

function setHistory(items: HistoryItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function useVerificationHistory() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['verification-history'],
    queryFn: getHistory,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const addToHistory = useMutation({
    mutationFn: async (item: HistoryItem) => {
      const history = getHistory()
      const filtered = history.filter((h) => h.cedula !== item.cedula)
      const updated = [item, ...filtered].slice(0, MAX_ITEMS)
      setHistory(updated)
      return updated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-history'] })
    },
  })

  const clearHistory = useMutation({
    mutationFn: async () => {
      setHistory([])
      return []
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-history'] })
    },
  })

  return {
    history: query.data ?? [],
    isLoading: query.isLoading,
    addToHistory,
    clearHistory,
  }
}
