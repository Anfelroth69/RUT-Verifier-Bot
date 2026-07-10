# Frontend Spec — Astro.js UI

## Overview

Single-page application for RUT verification. Astro.js for static shell, React components for interactive UI, TanStack React Query for data fetching.

---

## Components

### VerifyForm

**Purpose**: Input form for cédula number.

**Elements**:
- Text input: "Número de cédula"
- Submit button: "Verificar RUT"
- Loading spinner during request

**Validation**:
- Client-side: numeric only, 6–10 digits
- Regex: `/^\d{6,10}$/`

**Behavior**:
- On submit: `fetch POST {PUBLIC_API_URL}/api/v1/verify`
- Cold start detection: if response > 5s, show alert "El servidor se está despertando..."
- Timeout: 90s for cold starts

### ResultCard

**Purpose**: Display verification result.

**States**:
| State | Badge | Color | Icon |
|-------|-------|-------|------|
| RUT exists | "RUT Activo" | Green | ✓ |
| RUT not found | "Sin RUT" | Red | ✗ |
| Error | "Error" | Yellow | ⚠ |

**Data displayed**:
- `rut_exists` → badge color
- `message` → description
- `data.cedula_consultada` → verified ID
- `data.contenido_confirmado` → confirmed content
- `duration_ms` → response time

### HistoryPanel

**Purpose**: Show recent search history.

**Storage**: LocalStorage key `rut_history`

**Structure**:
```typescript
interface HistoryEntry {
  cedula: string;
  result: "active" | "inactive" | "error";
  timestamp: number;
}
```

**Constraints**:
- Max 10 entries
- Most recent first
- Clear button to wipe history

---

## Data Fetching

Using TanStack React Query v5:

```typescript
// Hook: useVerifyMutation
// - mutationFn: POST /api/v1/verify
// - onSuccess: save to history
// - onError: display error state
```

---

## Scenarios

### Scenario: Successful verification

```
Given the user enters cédula "16728423"
When the form is submitted
Then a loading spinner appears
And the request is sent to POST /api/v1/verify
And on success, a green ResultCard shows "RUT Activo"
And the search is saved to LocalStorage history
```

### Scenario: Cédula without RUT

```
Given the user enters cédula "99999999"
When the form is submitted
Then a red ResultCard shows "Sin RUT"
And the search is saved to LocalStorage history
```

### Scenario: Cold start warning

```
Given the backend is waking up from sleep
When the request takes longer than 5 seconds
Then a friendly alert appears: "El servidor se está despertando tras un periodo de inactividad, esto puede tomar un minuto..."
And the spinner continues until response
```

### Scenario: Validation error

```
Given the user enters cédula "abc123"
When the form is submitted
Then a validation message appears below the input
And no request is sent
```

### Scenario: Server error

```
Given the backend returns HTTP 503
When the response is received
Then a yellow ResultCard shows "Error"
And the error message from the response is displayed
```

### Scenario: History management

```
Given the user has performed 3 searches
When the history panel is viewed
Then all 3 entries appear in reverse chronological order
And clearing history removes all entries
```

---

## Responsive Design

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Single column, full-width form |
| Tablet (640–1024px) | Centered card, max-width 480px |
| Desktop (> 1024px) | Centered card, max-width 480px |

Tailwind CSS v4 only. No external component libraries.

---

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `PUBLIC_API_URL` | Backend API base URL | Yes |
