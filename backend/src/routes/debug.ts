import { Hono } from 'hono'

const app = new Hono()

app.get('/debug/dian-connectivity', async (c) => {
  const targets = [
    'https://muisca.dian.gov.co/WebIdentidadLogin',
    'https://muisca.dian.gov.co',
    'https://dian.gov.co',
  ]

  const results: Record<string, any> = {}

  for (const url of targets) {
    const start = Date.now()
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(15000),
        redirect: 'manual',
      })
      const body = await res.text().catch(() => '')
      results[url] = {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        timing: Date.now() - start,
        bodyLength: body.length,
      }
    } catch (err: any) {
      results[url] = {
        status: 0,
        error: err.name,
        message: err.message,
        timing: Date.now() - start,
      }
    }
  }

  return c.json({
    timestamp: new Date().toISOString(),
    container: 'rut-verifier-api-tlsc',
    results,
  })
})

export { app as debugRoutes }
