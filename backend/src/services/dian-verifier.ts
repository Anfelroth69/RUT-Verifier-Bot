import { Page } from 'playwright'

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
  constructor(private page: Page, private config: VerifierConfig) {}

  async verify(cedula: string): Promise<RutResult> {
    const startTime = Date.now()
    const result: RutResult = {
      status: 'failed',
      rut_exists: null,
      data: null,
      message: '',
      duration_ms: 0,
    }

    try {
      // Phase 1: Authentication
      await this.authenticate(cedula)

      // Phase 2: Navigation
      await this.navigateToSearch()

      // Phase 3: Search
      await this.performSearch(cedula)

      // Phase 4: Parse result
      result.status = 'success'
      const searchResult = await this.parseResult(cedula)

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
    }

    result.duration_ms = Date.now() - startTime
    return result
  }

  private async authenticate(cedula: string): Promise<void> {
    console.log(`[${cedula}] Phase 1: Authentication`)

    await this.page.goto('https://muisca.dian.gov.co/WebIdentidadLogin', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })

    // Wait for form to be visible
    await this.page.locator(SELECTORS.auth.doc_type_trigger).waitFor({
      state: 'visible',
      timeout: 15000,
    })

    // Clean notifications modal if present
    const notificationsModal = this.page.locator(SELECTORS.auth.modal_notifications)
    if (await notificationsModal.isVisible()) {
      console.log(`[${cedula}] Cleaning notifications modal`)
      const continueBtn = this.page.locator(SELECTORS.auth.modal_notifications_btn).first()
      if (await continueBtn.isVisible()) {
        await continueBtn.click()
      } else {
        await this.page.keyboard.press('Escape')
      }
      await notificationsModal.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {})
    }

    // Clean error login modal if present
    const errorModal = this.page.locator(SELECTORS.auth.modal_error_login)
    if (await errorModal.isVisible()) {
      console.log(`[${cedula}] Cleaning error login modal`)
      await this.page.keyboard.press('Escape')
      if (await errorModal.isVisible()) {
        const closeBtn = this.page.locator(SELECTORS.auth.modal_error_login_close).first()
        if (await closeBtn.isVisible()) {
          await closeBtn.click({ force: true })
        }
      }
      await errorModal.waitFor({ state: 'hidden', timeout: 5000 })
    }

    // Fill login form
    await this.page.locator(SELECTORS.auth.doc_type_trigger).click()
    await this.page.waitForSelector('.mat-select-panel', { state: 'visible', timeout: 5000 })

    const cedulaOption = this.page.locator(`${SELECTORS.auth.doc_type_options}:has-text('Cédula de ciudadanía')`).first()
    await cedulaOption.waitFor({ state: 'visible', timeout: 5000 })
    await cedulaOption.click({ force: true })

    await this.page.locator(SELECTORS.auth.input_username).fill(this.config.DIAN_DOCUMENT)
    await this.page.locator(SELECTORS.auth.input_password).fill(this.config.DIAN_PASSWORD)
    await this.page.locator(SELECTORS.auth.checkbox_terms).click()

    const submitBtn = this.page.locator(SELECTORS.auth.btn_submit)
    await submitBtn.waitFor({ state: 'visible' })
    await submitBtn.click()

    await this.page.waitForLoadState('domcontentloaded', { timeout: 30000 })

    if (this.page.url().includes('IdentidadLogin')) {
      throw new Error('Fallo en login. Verifique sus credenciales o estado del portal.')
    }
  }

  private async navigateToSearch(): Promise<void> {
    console.log('Phase 2: Navigation to search')
    await this.page.goto('https://muisca.dian.gov.co/WebArquitectura/DefConsultaPersonas.faces', {
      waitUntil: 'domcontentloaded',
    })
  }

  private async performSearch(cedula: string): Promise<void> {
    console.log(`[${cedula}] Phase 3: Search`)

    const searchInput = this.page.locator(SELECTORS.search.input_target_cedula)
    await searchInput.waitFor({ state: 'visible', timeout: 10000 })
    await searchInput.fill(cedula)

    const searchBtn = this.page.locator(SELECTORS.search.btn_search_jsf)
    await searchBtn.click()
  }

  private async parseResult(cedula: string): Promise<{ rutExists: boolean; rutNumber: string }> {
    console.log(`[${cedula}] Phase 4: Parse result`)

    const maxAttempts = 30

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Check for success (RUT found)
      const docLabel = this.page.locator('span.textoNegro').filter({ hasText: /^Documento:\s*$/ })
      if (await docLabel.isVisible()) {
        const blackSpans = this.page.locator(SELECTORS.results.span_success)
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
      const errorSelector = this.page.locator(SELECTORS.results.body).filter({ hasText: errorPattern })
      if (await errorSelector.isVisible()) {
        console.log(`[${cedula}] ❌ No RUT found`)
        return { rutExists: false, rutNumber: '' }
      }

      // Adaptive polling: faster checks early, slower later
      const delays = [200, 200, 200, 300, 300, 500]
      await this.page.waitForTimeout(delays[Math.min(attempt, delays.length - 1)])
    }

    throw new Error('Timeout de red: El servidor de la DIAN no arrojó ninguna estructura reconocible.')
  }
}
