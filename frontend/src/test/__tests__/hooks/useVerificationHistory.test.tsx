import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useVerificationHistory } from '../../../hooks/useVerificationHistory'
import React from 'react'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return Wrapper
}

describe('useVerificationHistory', () => {
  let Wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    Wrapper = createWrapper()
    localStorage.clear()
  })

  it('should return empty history initially', async () => {
    const { result } = renderHook(() => useVerificationHistory(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.history).toEqual([])
  })

  it('should add item to history', async () => {
    const { result } = renderHook(() => useVerificationHistory(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const item = {
      cedula: '16728423',
      timestamp: '2024-01-01T00:00:00Z',
      rut_exists: true,
      message: 'El RUT existe.',
      data: { cedula_consultada: '16728423', contenido_confirmado: '89012345' },
    }

    act(() => {
      result.current.addToHistory.mutate(item)
    })

    await waitFor(() => {
      expect(result.current.addToHistory.isSuccess).toBe(true)
    })

    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0].cedula).toBe('16728423')
  })

  it('should store history in localStorage', async () => {
    const { result } = renderHook(() => useVerificationHistory(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const item = {
      cedula: '16728423',
      timestamp: '2024-01-01T00:00:00Z',
      rut_exists: true,
      message: 'El RUT existe.',
      data: { cedula_consultada: '16728423', contenido_confirmado: '89012345' },
    }

    act(() => {
      result.current.addToHistory.mutate(item)
    })

    await waitFor(() => {
      expect(result.current.addToHistory.isSuccess).toBe(true)
    })

    const stored = localStorage.getItem('rutHistory')
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].cedula).toBe('16728423')
  })

  it('should limit history to MAX_ITEMS (10)', async () => {
    const { result } = renderHook(() => useVerificationHistory(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    for (let i = 1; i <= 12; i++) {
      act(() => {
        result.current.addToHistory.mutate({
          cedula: `cedula${i}`,
          timestamp: `2024-01-0${i}T00:00:00Z`,
          rut_exists: true,
          message: 'El RUT existe.',
          data: null,
        })
      })

      await waitFor(() => {
        expect(result.current.addToHistory.isSuccess).toBe(true)
      })
    }

    expect(result.current.history).toHaveLength(10)
    expect(result.current.history[0].cedula).toBe('cedula12')
    expect(result.current.history[9].cedula).toBe('cedula3')
  })

  it('should deduplicate by cedula', async () => {
    const { result } = renderHook(() => useVerificationHistory(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const item = {
      cedula: '16728423',
      timestamp: '2024-01-01T00:00:00Z',
      rut_exists: true,
      message: 'El RUT existe.',
      data: null,
    }

    act(() => {
      result.current.addToHistory.mutate(item)
    })

    await waitFor(() => {
      expect(result.current.addToHistory.isSuccess).toBe(true)
    })

    act(() => {
      result.current.addToHistory.mutate({ ...item, timestamp: '2024-01-02T00:00:00Z' })
    })

    await waitFor(() => {
      expect(result.current.addToHistory.isSuccess).toBe(true)
    })

    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0].timestamp).toBe('2024-01-02T00:00:00Z')
  })

  it('should clear history', async () => {
    const { result } = renderHook(() => useVerificationHistory(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.addToHistory.mutate({
        cedula: '16728423',
        timestamp: '2024-01-01T00:00:00Z',
        rut_exists: true,
        message: 'El RUT existe.',
        data: null,
      })
    })

    await waitFor(() => {
      expect(result.current.addToHistory.isSuccess).toBe(true)
    })

    expect(result.current.history).toHaveLength(1)

    act(() => {
      result.current.clearHistory.mutate()
    })

    await waitFor(() => {
      expect(result.current.clearHistory.isSuccess).toBe(true)
    })

    expect(result.current.history).toEqual([])
  })

  it('should load history from localStorage on mount', async () => {
    const existingHistory = [
      {
        cedula: '99999999',
        timestamp: '2024-01-01T00:00:00Z',
        rut_exists: false,
        message: 'La cédula consultada no tiene RUT.',
        data: null,
      },
    ]
    localStorage.setItem('rutHistory', JSON.stringify(existingHistory))

    const { result } = renderHook(() => useVerificationHistory(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0].cedula).toBe('99999999')
  })
})
