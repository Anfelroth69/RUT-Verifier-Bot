import { Hono } from 'hono'
import { DianVerifier } from '../services/dian-verifier.js'
import { semaphore } from '../core/semaphore.js'
import { config } from '../core/config.js'
import { RutRequestSchema } from '../schemas/rut.js'

const app = new Hono()

app.post('/verify', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = RutRequestSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({
        error: 'Validation failed',
        details: parsed.error.issues,
      }, 422)
    }

    const { cedula } = parsed.data

    // Acquire semaphore (limit to 1 concurrent Playwright instance)
    const release = await semaphore.acquire()

    try {
      const verifier = new DianVerifier(config)
      const result = await verifier.verify(cedula)

      if (result.status === 'failed') {
        return c.json({ message: result.message }, 503)
      }

      return c.json(result)
    } catch (error) {
      console.error(`Error verifying ${cedula}:`, error)
      return c.json({ message: 'Error interno del servidor' }, 500)
    } finally {
      release()
    }
  } catch (error) {
    console.error('Error parsing request:', error)
    return c.json({ message: 'Error interno del servidor' }, 500)
  }
})

export { app as verifyRoutes }
