# Automation Spec — Playwright + DIAN MUISCA

## Overview

Playwright automation that logs into DIAN MUISCA portal and verifies RUT status for a given cédula. Runs inside the Hono/TypeScript backend with `Semaphore(1)` enforcement. Target URLs:

- Login: `https://muisca.dian.gov.co/WebIdentidadLogin`
- Search: `https://muisca.dian.gov.co/WebArquitectura/DefConsultaPersonas.faces`

## Implementation

**File**: `backend/src/services/dian-verifier.ts`

The `DianVerifier` class encapsulates all automation logic in a single file:

```typescript
export class DianVerifier {
  async verify(cedula: string): Promise<RutResult>
  private async authenticate(page: Page, cedula: string): Promise<void>
  private async navigateToSearch(page: Page): Promise<void>
  private async performSearch(page: Page, cedula: string): Promise<void>
  private async parseResult(page: Page, cedula: string): Promise<{ rutExists: boolean; rutNumber: string }>
}
```

---

## Flow

```
1. Launch Chromium (optimized args)
2. Create context with locale es-CO
3. Navigate to DIAN login URL (https://muisca.dian.gov.co/WebIdentidadLogin)
4. Wait for login form visible
5. Handle notifications modal if present
6. Handle error login modal if present
7. Select "Cédula de ciudadanía" from Angular Material dropdown
8. Fill DIAN_DOCUMENT
9. Fill DIAN_PASSWORD
10. Accept terms checkbox
11. Click login button
12. Wait for redirect (or detect login failure)
13. Navigate to search URL (https://muisca.dian.gov.co/WebArquitectura/DefConsultaPersonas.faces)
14. Fill target cédula
15. Click JSF search button
16. Poll for result (max 30 attempts, 500ms interval)
17. Evaluate result text
18. Return structured RutResult
19. Close browser in finally block
```

---

## Selectors

Selectors are **hardcoded** in `backend/src/services/dian-verifier.ts` as `const SELECTORS`:

### Auth selectors

| Name | Selector | Purpose |
|------|----------|---------|
| `modal_notifications` | `text=Notificaciones` | Detect browser notifications dialog |
| `modal_notifications_text` | `'navegador le preguntara si desea permitir las notificaciones'` | Confirmation text |
| `modal_notifications_btn` | `text=Continuar` | Dismiss button |
| `modal_error_login` | `text=intentando ingresar de manera incorrecta` | Detect login error modal |
| `modal_error_login_close` | `button:has(mat-icon:has-text('close'))` | Close button for error modal |
| `doc_type_trigger` | `mat-select[name='tipoDocumento'] .mat-select-trigger` | Angular Material dropdown trigger |
| `doc_type_options` | `mat-option` | Dropdown option |
| `input_username` | `input[name='numDocumento']` | Document number field |
| `input_password` | `input[type='password']` | Password field |
| `checkbox_terms` | `mat-checkbox:has(input[name='aceptaTratamientoDatos'])` | Terms acceptance |
| `btn_submit` | `button.mat-raised-button:has-text('Ingresar')` | Login button |

### Search selectors

| Name | Selector | Purpose |
|------|----------|---------|
| `input_target_cedula` | `input[id='vistaConsultaPersonas:frmConsultaPersonas:txtNumIdentVigente']` | Target cédula input |
| `btn_search_jsf` | `input[type='image'][src*='botbuscar.gif']` | JSF search button (image input) |

### Results selectors

| Name | Selector | Purpose |
|------|----------|---------|
| `span_success` | `span[class='textoNegro']` | Key selector for RUT number text |
| `body` | `body` | Body for error pattern search |

---

## Scenarios

### Scenario: Successful login and RUT found

```
Given valid DIAN credentials
  And a cédula with active RUT
When the automation starts
Then Chromium launches with --no-sandbox --disable-dev-shm-usage --disable-gpu --single-process
  And the login page loads within 30 seconds
  And any modals are dismissed
  And credentials are filled into the form
  And the login button is clicked
  And the redirect completes within 10 seconds
Then the search page loads
  And the cédula is entered into the search field
  And the JSF search button is clicked
  And within 30 polling attempts (500ms each) span.textoNegro appears
  And a numeric span different from the searched cédula is found
Then the result is: { rutExists: true, rutNumber: "<RUT number>" }
```

### Scenario: Successful login, RUT not found

```
Given valid DIAN credentials
  And a cédula without active RUT
When the search is performed
Then within 30 polling attempts the page displays "no tiene registro de inscripción"
Then the result is: { rutExists: false, rutNumber: "" }
```

### Scenario: Login failure

```
Given invalid DIAN credentials
When the login is attempted
Then the page remains on the login URL
  And a timeout waiting for navigation occurs
Then the result is: { status: "failed", message: "Fallo en login..." }
```

### Scenario: Notifications modal blocking

```
Given a browser notifications modal appears after login page loads
When the automation detects the modal text
Then the "Continuar" button is clicked
  Or Escape is pressed if the button is not visible
  And navigation continues
```

### Scenario: Error login modal from previous session

```
Given a "intentando ingresar de manera incorrecta" modal is present
When the automation detects it
Then Escape is pressed
  And if still visible, the close (X) button is force-clicked
  And navigation continues
```

### Scenario: Navigation timeout

```
Given the DIAN portal is slow or unreachable
When any navigation exceeds the timeout (45s login, 15s search)
Then the automation catches the Playwright timeout
  And returns status "failed" with appropriate message
  And the browser is closed in finally
```

### Scenario: Unrecognized page structure

```
Given the DIAN portal returns a page with neither success spans nor error text
When the polling loop exhausts all 30 attempts
Then an exception is thrown: "Timeout de red: El servidor de la DIAN no arrojó ninguna estructura reconocible."
  And the result status is "failed"
```

---

## Memory Optimization

### Chromium Launch Args (MANDATORY for 512MB RAM)

```typescript
const browser = await chromium.launch({
  headless: process.env.PLAYWRIGHT_HEADLESS === 'true',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process'
  ]
})
```

### Semaphore(1) — Custom Implementation

```typescript
class Semaphore {
  private permits: number
  private queue: (() => void)[] = []

  async acquire(): Promise<() => void>
  private release(): void
}

export const semaphore = new Semaphore(1)
```

Only one Playwright instance at any time. Semaphore is acquired before `verify()` and released in `finally` block.

---

## Wait Strategy

**Preferred**: state-based waits via Playwright locators.

```typescript
// Wait for element visibility
await page.locator('selector').waitFor({ state: 'visible', timeout: 30000 })

// Wait for navigation to complete
await page.waitForNavigation({ timeout: 10000 })

// Wait for load state
await page.waitForLoadState('domcontentloaded')
```

**Known exception**: The JSF result polling loop uses `waitForTimeout(500)` between attempts. This is a pragmatic concession because JSF pages update dynamically without full page navigations, making it impossible to wait for a specific selector that may or may not appear. The polling approach checks actual page state each iteration.

---

## Locale Configuration

```typescript
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ...',
  permissions: [],
  locale: 'es-CO',
  extraHTTPHeaders: {
    'Accept-Language': 'es-CO,es;q=0.9'
  }
})
```

**DO NOT modify locale or Accept-Language**. These values are critical for the DIAN portal to route correctly. Removing or changing them may cause the portal to reject the session or redirect to a different page.

---

## Error Recovery

| Error | Recovery |
|-------|----------|
| Login timeout (45s) | Caught by Playwright timeout, fail with `status: "failed"` |
| Login modal blocking | Dismiss via click or Escape, continue |
| Login failure (stays on login page) | Detect URL still contains "IdentidadLogin", throw descriptive error |
| Element not found (search page) | Playwright timeout, fail with descriptive error |
| Navigation timeout (search page) | Playwright timeout, fail with `status: "failed"` |
| Browser crash | Error caught in try/catch, browser.close in finally ensures cleanup |
| Unrecognized result | Polling loop exhausts, throw descriptive timeout error |
| All errors | Semaphore released via finally in route handler |

---

## RutResult Contract

```typescript
interface RutResult {
  status: 'success' | 'failed'
  rut_exists: boolean | null
  data: { cedula_consultada: string; contenido_confirmado: string } | null
  message: string
  duration_ms: number
}
```

---

## Testing

Unit tests should verify:
- Semaphore acquisition and release behavior
- Result parsing logic (mocked page responses)
- Error propagation from automation to route handler
- Zod validation of request/response schemas

Integration tests should verify:
- Full flow with mocked DIAN portal responses (if feasible)
- Semaphore concurrency behavior (sequential execution)

**Note**: E2E tests against the live DIAN portal are not feasible in CI. Manual verification against known positive and negative cédulas is required after any selector change.
