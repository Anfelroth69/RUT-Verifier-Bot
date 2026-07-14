import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import { config } from './core/config.js'
import { browserManager } from './core/browser-manager.js'
import { verifyRoutes } from './routes/verify.js'
import { healthRoutes } from './routes/health.js'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: config.FRONTEND_URL,
  allowMethods: ['GET', 'POST'],
  allowHeaders: ['Content-Type'],
}))

// Routes
app.route('/api/v1', verifyRoutes)
app.route('/api/v1', healthRoutes)

// Start server
const port = config.PORT

const server = serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`🚀 Server running on http://localhost:${info.port}`)
})

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down gracefully...')
  await browserManager.close()
  server.close(() => {
    console.log('Server closed.')
    process.exit(0)
  })
  // Force exit after 5 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('Forced shutdown after timeout')
    process.exit(1)
  }, 5000)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
  shutdown()
})
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})
