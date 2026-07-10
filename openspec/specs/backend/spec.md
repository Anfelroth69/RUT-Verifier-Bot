# Backend Spec — Hono API + Playwright

## Endpoints

### POST /api/v1/verify

**Purpose**: Verify if a Colombian citizen ID has an active RUT.

**Request**:
```json
{
  "cedula_consulta": "16728423"
}
```

**Validation**:
- `cedula_consulta`: string, numeric only, 6–10 digits
- HTTP 422 on invalid input

**Success Response (200)**:
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

**Negative Response (200)**:
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
  "status": "failed",
  "rut_exists": null,
  "data": null,
  "message": "Error al procesar la solicitud.",
  "duration_ms": 12045
}
```

### GET /api/v1/health

**Purpose**: Healthcheck endpoint for Render.com.

**Response (200)**:
```json
{
  "status": "ok",
  "timestamp": "2026-07-09T21:00:00Z"
}
```

---

## Scenarios

### Scenario: Successful RUT verification

```
Given a valid cédula "16728423" that has an active RUT
When the client sends POST /api/v1/verify with cedula_consulta "16728423"
Then the backend launches Playwright with Semaphore(1)
And navigates to DIAN MUISCA login
And authenticates with DIAN_DOCUMENT and DIAN_PASSWORD
And searches for the cédula
And the portal displays a result page
Then the response contains status "success" and rut_exists true
And duration_ms is a positive integer
```

### Scenario: Cédula without RUT

```
Given a valid cédula "99999999" that has no active RUT
When the client sends POST /api/v1/verify with cedula_consulta "99999999"
Then the backend performs the search
And the portal displays "no registration" pattern
Then the response contains status "success" and rut_exists false
```

### Scenario: Invalid input format

```
Given a cédula "abc123" with non-numeric characters
When the client sends POST /api/v1/verify with cedula_consulta "abc123"
Then the response is HTTP 422 with validation error
```

### Scenario: DIAN portal unavailable

```
Given the DIAN MUISCA portal is unreachable
When the client sends a valid verify request
Then the backend catches the navigation error
Then the response is HTTP 503 with status "failed"
```

### Scenario: Concurrent requests

```
Given two requests arrive simultaneously
When the first request acquires Semaphore(1)
Then the second request waits in queue
And both requests eventually complete with valid responses
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
| 422 | Validation Error | Invalid cédula format |
| 503 | Service Unavailable | Playwright/DIAN failure |
| 500 | Internal Error | Unexpected server error |
