import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const handlers = [
  http.post('*/api/v1/verify', () => {
    return HttpResponse.json({
      status: 'success',
      rut_exists: true,
      data: { cedula_consultada: '16728423', contenido_confirmado: '89012345' },
      message: 'El RUT existe.',
      duration_ms: 5000,
    })
  }),
]

export const server = setupServer(...handlers)
