import { chromium, Browser, BrowserContext, Page } from 'playwright'
import { config } from './config.js'

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--no-zygote',
  '--disable-setuid-sandbox',
  '--single-process',
  '--disable-extensions',
  '--disable-background-networking',
  '--mute-audio',
  '--js-flags=--max_old_space_size=256',
]

const IDLE_TIMEOUT_MS = 5 * 60 * 1000

const SHARED_CONTEXT_OPTS = {
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  permissions: [],
  locale: 'es-CO',
  extraHTTPHeaders: {
    'Accept-Language': 'es-CO,es;q=0.9',
  },
}

async function launchBrowser(): Promise<Browser> {
  return await chromium.launch({
    headless: config.PLAYWRIGHT_HEADLESS,
    args: BROWSER_ARGS,
  })
}

class BrowserManager {
  private browser: Browser | null = null
  private activeContexts = 0
  private idleTimer: ReturnType<typeof setTimeout> | null = null

  async acquire(): Promise<{ page: Page; context: BrowserContext; release: () => void }> {
    this.clearIdleTimer()

    await this.ensureBrowser()

    const { context, page } = await this.createPage()
    this.activeContexts++

    const release = () => {
      this.activeContexts--
      page.close().catch(() => {})
      context.close().catch(() => {})
      this.resetIdleTimer()
    }

    return { page, context, release }
  }

  private async ensureBrowser(): Promise<void> {
    if (this.browser?.isConnected()) return
    if (this.browser) {
      await this.browser.close().catch(() => {})
    }
    this.browser = await launchBrowser()
  }

  private async createPage(retries = 2): Promise<{ page: Page; context: BrowserContext }> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await this.ensureBrowser()
        const context = await this.browser!.newContext(SHARED_CONTEXT_OPTS)
        const page = await context.newPage()
        return { context, page }
      } catch (err) {
        if (attempt < retries) {
          this.browser = null
          continue
        }
        throw err
      }
    }
    throw new Error('No se pudo crear una página del navegador tras varios intentos.')
  }

  async close(): Promise<void> {
    this.clearIdleTimer()
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  private resetIdleTimer(): void {
    this.clearIdleTimer()
    if (this.activeContexts === 0) {
      this.idleTimer = setTimeout(() => {
        if (this.browser && this.activeContexts === 0) {
          this.browser.close().catch(() => {})
          this.browser = null
        }
      }, IDLE_TIMEOUT_MS)
    }
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
  }
}

export const browserManager = new BrowserManager()
