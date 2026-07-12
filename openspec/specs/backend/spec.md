# Backend Spec — Hono API + Playwright

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Hono + @hono/node-server |
| Language | TypeScript (compiled to Node.js) |
| Automation | Playwright for Node.js (Chromium) |
| Validation | Zod schemas |
| Deployment | Render.com (Docker, 512MB RAM) |

## Endpoints

### POST /api/v1/verify

**Purpose**: Verify if a Colombian citizen ID has an active RUT.

**Request**:
```json
{
  "cedula": "16728423"
}
```

**Validation**:
- `cedula`: string, numeric only, 6–10 digits
- Regex: `/^\d{6,10}$/`
- HTTP 422 on invalid input with Zod issue details

**Success Response (200) — RUT exists**:
```json
{
  "status": "success",
  "rut_exists": true,
  "data": {
    "cedula_consultada": "16728423",
    "contenido_confirmado": "16728423"
  },
  "message": "El RUT existe.",
  "duration_ms": 4823
}
```

**Success Response (200) — No RUT**:
```json
{
  "status": "success",
  "rut_exists": false,
  "data": null,
  "message": "La cédula consultada no tiene RUT.",
  "duration_ms": 3201
}
```

**Error Response (503)**:
```json
{
  "message": "Error al procesar la solicitud."
}
```

**Error Response (500)**:
```json
{
  "message": "Error interno del servidor"
}
```

### GET /api/v1/health

**Purpose**: Healthcheck endpoint for Render.com.

**Response (200)**:
```json
{
  "status": "healthy",
  "timestamp": "2026-07-09T21:00:00.000Z"
}
```

---

## Scenarios

### Scenario: Successful RUT verification

```
Given a valid cédula "16728423" that has an active RUT
When the client sends POST /api/v1/verify with cedula "16728423"
Then the backend acquires Semaphore(1)
  And launches Playwright with optimized args
  And navigates to DIAN MUISCA login
  And authenticates with DIAN_DOCUMENT and DIAN_PASSWORD
  And navigates to the search page
  And enters the target cédula and submits the JSF search
  And the portal displays a result page with span.textoNegro
Then the response contains status "success" and rut_exists true
  And duration_ms is a positive integer
```

### Scenario: Cédula without RUT

```
Given a valid cédula "99999999" that has no active RUT
When the client sends POST /api/v1/verify with cedula "99999999"
Then the backend performs the search
  And the portal displays "no registration" pattern
Then the response contains status "success" and rut_exists false
  And data is null
```

### Scenario: Invalid input format

```
Given a cédula "abc123" with non-numeric characters
When the client sends POST /api/v1/verify with cedula "abc123"
Then the response is HTTP 422 with validation error details
```

### Scenario: DIAN portal unavailable

```
Given the DIAN MUISCA portal is unreachable
When the client sends a valid verify request
Then the backend catches the navigation error
  And returns HTTP 503 with error message
```

### Scenario: Concurrent requests

```
Given two requests arrive simultaneously
When the first request acquires Semaphore(1)
Then the second request waits in queue
  And both requests eventually complete with valid responses
  And only one Playwright instance runs at a time
```

### Scenario: Browser crash or OOM

```
Given the browser process crashes during execution
When the error is caught
Then the semaphore is released in the finally block
  And the response is HTTP 503
```

---

## CORS Configuration

```typescript
{
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}
```

---

## Error Codes

| HTTP | Meaning | Trigger |
|------|---------|---------|
| 200 | Success | Valid request, result found or not found |
| 422 | Validation Error | Invalid cédula format (Zod validation) |
| 503 | Service Unavailable | Playwright/DIAN failure (timeout, login failure, etc.) |
| 500 | Internal Error | Unexpected server error |

---

## Selectors

Selectors for the DIAN MUISCA portal are **hardcoded** in `backend/src/services/dian-verifier.ts` as a `const SELECTORS` object (not in an external JSON file). They are organized by phase:

- `auth`: Login form elements (Angular Material selectors, modal dialogs)
- `search`: JSF search input and button
- `results`: Result text (`span.textoNegro`) and body

---

## Concurrency

A custom `Semaphore` class (`backend/src/core/semaphore.ts`) limits Playwright to **1 concurrent instance**:

```typescript
class Semaphore {
  private permits: number
  private queue: (() => void)[] = []
  // acquire/release implementation
}
export const semaphore = new Semaphore(1)
```

No external library. No database. No cache layer.
