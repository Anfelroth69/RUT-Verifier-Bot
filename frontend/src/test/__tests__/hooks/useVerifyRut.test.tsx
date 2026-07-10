import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useVerifyRut } from '../../../hooks/useVerifyRut'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
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
  return { queryClient, Wrapper }
}

describe('useVerifyRut', () => {
  let queryClient: QueryClient
  let Wrapper: React.FC<{ children: React.ReactNode }>

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  beforeEach(() => {
    const wrapper = createWrapper()
    queryClient = wrapper.queryClient
    Wrapper = wrapper.Wrapper
  })

  it('should verify a valid cedula successfully', async () => {
    const { result } = renderHook(() => useVerifyRut(), { wrapper: Wrapper })

    act(() => {
      result.current.mutate('16728423')
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.status).toBe('success')
    expect(result.current.data?.rut_exists).toBe(true)
    expect(result.current.data?.data?.cedula_consultada).toBe('16728423')
    expect(result.current.data?.data?.contenido_confirmado).toBe('89012345')
  })

  it('should handle API error', async () => {
    server.use(
      http.post('*/api/v1/verify', () => {
        return HttpResponse.json(
          { message: 'Error interno del servidor' },
          { status: 500 }
        )
      })
    )

    const { result } = renderHook(() => useVerifyRut(), { wrapper: Wrapper })

    act(() => {
      result.current.mutate('16728423')
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toBe('Error interno del servidor')
  })

  it('should handle network error', async () => {
    server.use(
      http.post('*/api/v1/verify', () => {
        return HttpResponse.error()
      })
    )

    const { result } = renderHook(() => useVerifyRut(), { wrapper: Wrapper })

    act(() => {
      result.current.mutate('16728423')
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it('should invalidate verification-history query on success', async () => {
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useVerifyRut(), { wrapper: Wrapper })

    act(() => {
      result.current.mutate('16728423')
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['verification-history'],
    })
  })
})
