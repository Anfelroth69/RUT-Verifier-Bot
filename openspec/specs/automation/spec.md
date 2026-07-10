# Automation Spec — Playwright + DIAN MUISCA

## Overview

Playwright automation that logs into DIAN MUISCA portal and verifies RUT status for a given cédula. Runs inside the Hono backend with `Semaphore(1)` enforcement.

---

## Flow

```
1. Launch Chromium (optimized args)
2. Navigate to DIAN login URL
3. Wait for login form visible
4. Fill document number (DIAN_DOCUMENT)
5. Fill password (DIAN_PASSWORD)
6. Click login button
7. Handle modal/popup if present
8. Navigate to search URL
9. Fill cédula field
10. Click search button
11. Wait for result page
12. Evaluate result text
13. Return structured result
14. Close browser
```

---

## Selectors

Stored in `backend/src/services/selectors.json`.

| Step | Selector Strategy | Notes |
|------|------------------|-------|
| Login form | `input[name]` by type | Angular Material inputs |
| Login button | `button[type="submit"]` | May have Angular binding |
| Modal close | `.mat-dialog-close` or overlay dismiss | Handle if present |
| Search input | `input[id*="cedula"]` or label-based | JSF form |
| Search button | `button[type="submit"]` | JSF command button |
| Result text | `span.textoNegro` | Key selector for result |

**Critical**: Selectors may change. Always verify against live portal before modifying.

---

## Scenarios

### Scenario: Successful login and RUT found

```
Given valid DIAN credentials
And a cédula with active RUT
When the automation starts
Then Chromium launches with --no-sandbox --disable-dev-shm-usage --disable-gpu --single-process
And the login page loads within 30 seconds
And credentials are filled into the form
And the login button is clicked
And no blocking modal appears (or modal is dismissed)
Then the search page loads
And the cédula is entered into the search field
And the search button is clicked
And the result page displays with span.textoNegro containing the cédula
Then the result is: { rut_exists: true, data: { cedula_consultada, contenido_confirmado } }
```

### Scenario: Successful login, RUT not found

```
Given valid DIAN credentials
And a cédula without active RUT
When the search is performed
Then the result page displays "no registration" pattern
Then the result is: { rut_exists: false, data: null }
```

### Scenario: Login failure

```
Given invalid DIAN credentials
When the login is attempted
Then the page displays an error or remains on login
Then the result is: { status: "failed", message: "Error de autenticación DIAN" }
```

### Scenario: Modal/popup blocking

```
Given a modal overlay appears after login
When the automation detects the modal
Then the modal is dismissed via close button click
And navigation continues to search page
```

### Scenario: Navigation timeout

```
Given the DIAN portal is slow or unreachable
When any navigation exceeds 30 seconds
Then the automation catches the timeout error
And returns status "failed" with appropriate message
And the browser is closed
```

### Scenario: Browser crash or OOM

```
Given the browser process crashes during execution
When the error is caught
Then the semaphore is released
And the error is propagated to the API handler
And the response is HTTP 503
```

---

## Memory Optimization

### Chromium Launch Args (MANDATORY)

```typescript
const browser = await chromium.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process'
  ]
});
```

### Semaphore(1)

```typescript
import { Semaphore } from 'async-mutex';

const browserSemaphore = new Semaphore(1);

// Only one Playwright session at a time
const [release] = await browserSemaphore.acquire();
try {
  // ... run automation
} finally {
  release();
}
```

---

## Wait Strategy

**NEVER use `waitForTimeout()`.**

Preferred patterns:

```typescript
// Wait for element visibility
await page.locator('selector').waitFor({ state: 'visible', timeout: 30000 });

// Wait for navigation
await page.waitForURL('**/target-page**', { timeout: 30000 });

// Wait for specific text
await page.locator('span.textoNegro').waitFor({ state: 'visible', timeout: 30000 });

// Wait for network idle (use sparingly)
await page.waitForLoadState('networkidle', { timeout: 15000 });
```

---

## Locale Configuration

```typescript
const context = await browser.newContext({
  locale: 'es-CO',
  extraHTTPHeaders: {
    'Accept-Language': 'es-CO,es;q=0.9'
  }
});
```

**DO NOT modify these values. Removing them may cause routing failures in MUISCA.**

---

## Error Recovery

| Error | Recovery |
|-------|----------|
| Login timeout | Retry once, then fail with 503 |
| Modal blocking | Click dismiss, continue |
| Element not found | Check selectors.json, fail with 503 |
| Navigation timeout | Fail with 503 |
| Browser crash | Release semaphore, fail with 503 |

---

## Testing

Unit tests should verify:
- Selector loading from selectors.json
- Semaphore acquisition and release
- Result parsing logic
- Error propagation

Integration tests should verify:
- Full flow with mock DIAN portal (if feasible)
- Semaphore concurrency behavior
