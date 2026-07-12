# Frontend Spec — Astro.js UI

## Overview

Single-page application for RUT verification. Astro.js for static shell, React components for interactive UI, TanStack React Query for data fetching. Built with Tailwind CSS v4. No external component libraries.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Astro.js 6.x + TypeScript |
| Interactive UI | React 19 (client islands) |
| Data Fetching | TanStack React Query v5 |
| Styling | Tailwind CSS v4 |
| Table | @tanstack/react-table (history) |
| XLSX Parsing | xlsx (SheetJS) |
| Testing | Vitest + @testing-library/react + MSW |
| Deployment | Render.com (static site) |

## Components

### VerifyForm (Astro + vanilla JS)

**File**: `frontend/src/components/VerifyForm.astro`

**Purpose**: Input form for cédula number. Uses vanilla JS for interactivity (not React).

**Elements**:
- Text input: "Número de Cédula"
- Submit button: "Verificar RUT"
- Loading spinner during request
- Cold start alert (hidden, shown after 5s)

**Validation**:
- Client-side: HTML5 `pattern` attribute, regex `/^\d{6,10}$/`
- User-invalid CSS pseudoclass for styling

**Behavior**:
- On submit: `fetch POST {PUBLIC_API_URL}/api/v1/verify`
- AbortController with 90s timeout
- Cold start detection: if response > 5s, show alert "El servidor se está despertando..."
- On success: renders result via template, saves to LocalStorage history
- On error: shows error alert with message

### ResultCard (Astro + HTML template)

**File**: `frontend/src/components/ResultCard.astro`

**Purpose**: Provides the HTML container and `<template>` elements for result display and history items. Rendering is done client-side via vanilla JS from `VerifyForm`.

**States**:
| State | Badge | Color |
|-------|-------|-------|
| RUT exists | "RUT Activo" | Green (bg-green-100, text-green-800) |
| RUT not found | "Sin RUT" | Red (bg-red-100, text-red-800) |
| Error | "Error" | Yellow (bg-yellow-100, text-yellow-800) |

**Data displayed**:
- `cedula` → verified ID
- `message` → description
- `data.contenido_confirmado` → confirmed content (if exists)
- `duration_ms` → response time

### PageContent (React)

**File**: `frontend/src/components/PageContent.tsx`

**Purpose**: React island that wraps interactive components.

```tsx
<QueryProvider>
  <BatchUpload />
</QueryProvider>
```

### BatchUpload (React)

**File**: `frontend/src/components/BatchUpload.tsx`

**Purpose**: File upload component for batch verification via CSV or XLSX.

**States**: `idle` → `file-selected` → `validating` → `ready` → `processing` → `completed` / `error`

**Features**:
- Drag & drop file selection
- CSV and XLSX parsing (via SheetJS)
- NIT extraction (6-10 digit numbers)
- Max 50 records per batch
- Max file size 5MB
- Progress bar during processing
- Auto-download results as CSV
- 2s delay between individual verifications
- 90s timeout per individual request

### VerificationTable (React)

**File**: `frontend/src/components/VerificationTable.tsx`

**Purpose**: Display verification history using @tanstack/react-table.

**Columns**: Cédula, Estado RUT (badge), Fecha, Resultado

**Empty state**: "Aún no hay consultas en el historial."

### History (localStorage + React Query)

**File**: `frontend/src/hooks/useVerificationHistory.ts`

**Type**:
```typescript
interface HistoryItem {
  cedula: string;
  timestamp: string;
  rut_exists: boolean | null;
  message: string;
  data: RutData | null;
}
```

**Storage**: LocalStorage key `rutHistory`

**Constraints**:
- Max 10 entries
- Deduplicated by cédula (keeps most recent)
- TanStack Query cache with staleTime: Infinity
- Clear button to wipe all history

---

## Data Fetching

### useVerifyRut (vanilla form)

**File**: `frontend/src/hooks/useVerifyRut.ts`

- `useMutation` from TanStack Query v5
- `mutationFn`: `POST /api/v1/verify`
- `onSuccess`: invalidates `['verification-history']` query

**Note**: The primary verification form (`VerifyForm.astro`) uses vanilla `fetch` directly, not this hook. The hook exists for potential React-based usage.

### useBatchVerify

**File**: `frontend/src/hooks/useBatchVerify.ts`

- `useMutation` for batch file processing
- Parses file locally (CSV via SheetJS, XLSX via SheetJS)
- Iterates through NITs with 2s delay between calls
- Returns summary: `{ results, total, with_rut, without_rut, errors, duration_ms }`
- Generates downloadable CSV result file

---

## Layout

**File**: `frontend/src/layouts/Layout.astro`

- Single column on mobile, two columns on desktop (lg:grid-cols-3)
- Main area (2/3): form + result card + batch upload
- Sidebar (1/3): history panel (sticky, scrollable)
- Tailwind CSS v4 classes throughout

---

## Scenarios

### Scenario: Successful single verification

```
Given the user enters cédula "16728423"
When the form is submitted
Then a loading spinner appears on the button
  And if the request exceeds 5s, a cold-start alert is shown
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
Given the backend is waking up from sleep on Render
When the request takes longer than 5 seconds
Then a blue alert appears: "El servidor se está despertando..."
  And the spinner continues until response
```

### Scenario: Request timeout

```
Given the backend does not respond within 90 seconds
When the AbortController triggers
Then an error alert shows: "La petición ha excedido el tiempo de espera (90s)"
```

### Scenario: Validation error

```
Given the user enters cédula "abc123"
When the form is submitted
Then the browser's built-in validation prevents submission
  And the user-invalid:block CSS shows the error message
  And no request is sent
```

### Scenario: Batch upload with XLSX

```
Given the user selects an .xlsx file with 10 valid NITs
When the file is parsed
Then 10 NITs are detected and shown
  And the user clicks "Verificar 10 NITs"
  Then each NIT is verified sequentially with 2s delay
  And a progress bar shows current/total
  On completion, a CSV is downloaded automatically
  And a summary shows "X de 10 verificados con RUT"
```

### Scenario: Batch file with no valid NITs

```
Given the user selects a CSV with no valid 6-10 digit numbers
When the file is parsed
Then an error is shown: "No se encontraron NITs válidos"
  And the user can select another file
```

### Scenario: History management

```
Given the user has performed 3 searches
When the history sidebar is viewed
Then all 3 entries appear in reverse chronological order
  And each shows cédula, status indicator (green/red/yellow), date, and message
  And clearing history removes all entries
  And max 10 entries are stored
```

### Scenario: Server error

```
Given the backend returns HTTP 503
When the response is received
Then a yellow ResultCard shows "Error"
  And the error message from the response is displayed
```

---

## Responsive Design

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Single column, full-width form + batch |
| Tablet (640–1024px) | Single column, centered |
| Desktop (> 1024px) | Two columns: main (2/3) + history sidebar (1/3) |

---

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `PUBLIC_API_URL` | Backend API base URL | Yes (default: http://localhost:8000) |

## Build & Run

```bash
pnpm install
pnpm run dev    # Development server on :4321
pnpm run build  # Static build to ./dist
```
