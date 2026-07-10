import { useMutation, useQueryClient } from '@tanstack/react-query'

interface RutResponse {
  status: 'success' | 'failed'
  rut_exists: boolean | null
  data: { cedula_consultada: string; contenido_confirmado: string } | null
  message: string
  duration_ms: number
}

export function useVerifyRut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (cedula: string): Promise<RutResponse> => {
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/v1/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al verificar RUT')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate history query to refresh the table
      queryClient.invalidateQueries({ queryKey: ['verification-history'] })
    },
  })
}
