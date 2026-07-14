import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyRoutes } from '../../../routes/verify.js'

// Mock config (avoids env validation)
vi.mock('../../../core/config.js', () => ({
  config: {
    PORT: 8000,
    DIAN_DOCUMENT: 'test-doc',
    DIAN_PASSWORD: 'test-pass',
    PLAYWRIGHT_HEADLESS: true,
    FRONTEND_URL: 'http://localhost:4321',
  },
}))

// Mock DianVerifier (must be a class since route uses `new DianVerifier(page, config)`)
vi.mock('../../../services/dian-verifier.js', () => ({
  DianVerifier: class {
    verify = vi.fn().mockResolvedValue({
      status: 'success',
      rut_exists: true,
      data: { cedula_consultada: '16728423', contenido_confirmado: '89012345' },
      message: 'El RUT existe.',
      duration_ms: 5000,
    })
  },
}))

describe('Verify Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('POST /verify should return 200 with valid cedula', async () => {
    const req = new Request('http://localhost/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cedula: '16728423' }),
    })

    const res = await verifyRoutes.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.status).toBe('success')
    expect(data.rut_exists).toBe(true)
  })

  it('POST /verify should return 422 with invalid cedula', async () => {
    const req = new Request('http://localhost/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cedula: '123' }), // Too short
    })

    const res = await verifyRoutes.fetch(req)

    expect(res.status).toBe(422)
  })

  it('POST /verify should return 422 with non-numeric cedula', async () => {
    const req = new Request('http://localhost/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cedula: 'abc123' }),
    })

    const res = await verifyRoutes.fetch(req)

    expect(res.status).toBe(422)
  })
})
