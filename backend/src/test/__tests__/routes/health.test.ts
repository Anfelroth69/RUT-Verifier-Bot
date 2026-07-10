import { describe, it, expect } from 'vitest'
import { healthRoutes } from '../../../routes/health.js'

describe('Health Routes', () => {
  it('GET /health should return 200', async () => {
    const req = new Request('http://localhost/health')
    const res = await healthRoutes.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.timestamp).toBeDefined()
  })
})
