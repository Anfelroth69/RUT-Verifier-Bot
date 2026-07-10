import { Hono } from 'hono'

const app = new Hono()

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
})

export { app as healthRoutes }
