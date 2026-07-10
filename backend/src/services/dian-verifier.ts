import { chromium, Browser, Page } from 'playwright'
import { z } from 'zod'

interface RutResult {
  status: 'success' | 'failed'
  rut_exists: boolean | null
  data: { cedula_consultada: string; contenido_confirmado: string } | null
  message: string
  duration_ms: number
}

interface VerifierConfig {
  DIAN_DOCUMENT: string
  DIAN_PASSWORD: string
  PLAYWRIGHT_HEADLESS: boolean
}

// Selectors for DIAN MUISCA portal
const SELECTORS = {
  auth: {
    modal_notifications: 'text=Notificaciones',
    modal_notifications_text: 'navegador le preguntara si desea permitir las notificaciones',
    modal_notifications_btn: 'text=Continuar',
    modal_error_login: 'text=intentando ingresar de manera incorrecta',
    modal_error_login_close: "button:has(mat-icon:has-text('close')), mat-icon:has-text('close')",
    doc_type_trigger: "mat-select[name='tipoDocumento'] .mat-select-trigger",
    doc_type_options: 'mat-option',
    input_username: "input[name='numDocumento']",
    input_password: "input[type='password']",
    checkbox_terms: "mat-checkbox:has(input[name='aceptaTratamientoDatos'])",
    btn_submit: "button.mat-raised-button:has-text('Ingresar')",
  },
  search: {
    input_target_cedula: "input[id='vistaConsultaPersonas:frmConsultaPersonas:txtNumIdentVigente']",
    btn_search_jsf: "input[type='image'][src*='botbuscar.gif'], input[name='vistaConsultaPersonas:frmConsultaPersonas:_id46']",
  },
  results: {
    span_success: "span[class='textoNegro']",
    body: 'body',
  },
}

export class DianVerifier {
  private config: VerifierConfig

  constructor(config: VerifierConfig) {
    this.config = config
  }

  async verify(cedula: string): Promise<RutResult> {
    const startTime = Date.now()
    const result: RutResult = {
      status: 'failed',
      rut_exists: null,
      data: null,
      message: '',
      duration_ms: 0,
    }

    let browser: Browser | null = null

    try {
      // Launch browser with memory optimization flags for Render Free Tier
      browser = await chromium.launch({
        headless: this.config.PLAYWRIGHT_HEADLESS,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
        ],
      })

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        permissions: [],
        locale: 'es-CO',
        extraHTTPHeaders: {
          'Accept-Language': 'es-CO,es;q=0.9',
        },
      })

      const page = await context.newPage()

      // Phase 1: Authentication
      await this.authenticate(page, cedula)

      // Phase 2: Navigation
      await this.navigateToSearch(page)

      // Phase 3: Search
      await this.performSearch(page, cedula)

      // Phase 4: Parse result
      result.status = 'success'
      const searchResult = await this.parseResult(page, cedula)

      if (searchResult.rutExists) {
        result.rut_exists = true
        result.data = {
          cedula_consultada: cedula,
          contenido_confirmado: searchResult.rutNumber,
        }
        result.message = 'El RUT existe.'
      } else {
        result.rut_exists = false
        result.message = 'La cédula consultada no tiene RUT.'
      }
    } catch (error: any) {
      result.message = error.message || 'Error en el proceso'
      console.error(`[${cedula}] Error:`, error)
    } finally {
      if (browser) {
        await browser.close()
      }
    }

    result.duration_ms = Date.now() - startTime
    return result
  }

  private async authenticate(page: Page, cedula: string): Promise<void> {
    console.log(`[${cedula}] Phase 1: Authentication`)

    await page.goto('https://muisca.dian.gov.co/WebIdentidadLogin', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    })

    // Wait for form to be visible
    await page.locator(SELECTORS.auth.doc_type_trigger).waitFor({
      state: 'visible',
      timeout: 20000,
    })

    // Clean notifications modal if present
    const notificationsModal = page.locator(SELECTORS.auth.modal_notifications)
    if (await notificationsModal.isVisible()) {
      console.log(`[${cedula}] Cleaning notifications modal`)
      const continueBtn = page.locator(SELECTORS.auth.modal_notifications_btn).first()
      if (await continueBtn.isVisible()) {
        await continueBtn.click()
      } else {
        await page.keyboard.press('Escape')
      }
      await notificationsModal.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {})
    }

    // Clean error login modal if present
    const errorModal = page.locator(SELECTORS.auth.modal_error_login)
    if (await errorModal.isVisible()) {
      console.log(`[${cedula}] Cleaning error login modal`)
      await page.keyboard.press('Escape')
      if (await errorModal.isVisible()) {
        const closeBtn = page.locator(SELECTORS.auth.modal_error_login_close).first()
        if (await closeBtn.isVisible()) {
          await closeBtn.click({ force: true })
        }
      }
      await errorModal.waitFor({ state: 'hidden', timeout: 5000 })
    }

    // Fill login form
    await page.locator(SELECTORS.auth.doc_type_trigger).click()
    await page.waitForSelector('.mat-select-panel', { state: 'visible', timeout: 5000 })

    const cedulaOption = page.locator(`${SELECTORS.auth.doc_type_options}:has-text('Cédula de ciudadanía')`).first()
    await cedulaOption.waitFor({ state: 'visible', timeout: 5000 })
    await cedulaOption.click({ force: true })

    await page.locator(SELECTORS.auth.input_username).fill(this.config.DIAN_DOCUMENT)
    await page.locator(SELECTORS.auth.input_password).fill(this.config.DIAN_PASSWORD)
    await page.locator(SELECTORS.auth.checkbox_terms).click()

    const submitBtn = page.locator(SELECTORS.auth.btn_submit)
    await submitBtn.waitFor({ state: 'visible' })
    await submitBtn.click()

    await page.waitForLoadState('domcontentloaded')

    // Check for login failure
    try {
      await page.waitForNavigation({ timeout: 10000 })
    } catch {
      if (page.url().includes('IdentidadLogin')) {
        throw new Error('Fallo en login. Verifique sus credenciales o estado del portal.')
      }
    }
  }

  private async navigateToSearch(page: Page): Promise<void> {
    console.log('Phase 2: Navigation to search')
    await page.goto('https://muisca.dian.gov.co/WebArquitectura/DefConsultaPersonas.faces', {
      waitUntil: 'domcontentloaded',
    })
  }

  private async performSearch(page: Page, cedula: string): Promise<void> {
    console.log(`[${cedula}] Phase 3: Search`)

    const searchInput = page.locator(SELECTORS.search.input_target_cedula)
    await searchInput.waitFor({ state: 'visible', timeout: 15000 })
    await searchInput.fill(cedula)

    const searchBtn = page.locator(SELECTORS.search.btn_search_jsf)
    await searchBtn.click()
  }

  private async parseResult(page: Page, cedula: string): Promise<{ rutExists: boolean; rutNumber: string }> {
    console.log(`[${cedula}] Phase 4: Parse result`)

    const maxAttempts = 30

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Check for success (RUT found)
      const docLabel = page.locator('span.textoNegro').filter({ hasText: /^Documento:\s*$/ })
      if (await docLabel.isVisible()) {
        const blackSpans = page.locator(SELECTORS.results.span_success)
        const count = await blackSpans.count()

        for (let i = 0; i < count; i++) {
          const text = (await blackSpans.nth(i).innerText()).trim()
          if (/^\d+$/.test(text) && text !== cedula) {
            console.log(`[${cedula}] ✅ RUT found: ${text}`)
            return { rutExists: true, rutNumber: text }
          }
        }
      }

      // Check for error (no registration)
      const errorPattern = /no tiene registro de inscripci[oó]n/i
      const errorSelector = page.locator(SELECTORS.results.body).filter({ hasText: errorPattern })
      if (await errorSelector.isVisible()) {
        console.log(`[${cedula}] ❌ No RUT found`)
        return { rutExists: false, rutNumber: '' }
      }

      // Wait before next attempt (state-based, not static timeout)
      await page.waitForTimeout(500)
    }

    throw new Error('Timeout de red: El servidor de la DIAN no arrojó ninguna estructura reconocible.')
  }
}
