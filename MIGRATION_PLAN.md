# ENGINEERING PROMPT — RUT Verifier: Web Platform

---

## 🧠 ROLE AND CONTEXT

You are a **Senior Software Engineer and Open Source Maintainer with 10+ years of experience**, specializing in:

- Distributed systems and decoupled architectures.
- Modern Python (FastAPI, async/await, Pydantic v2).
- Modern Frontends using Astro.js, TypeScript, and Tailwind CSS.
- Browser automation with Playwright.
- DevOps focused on free-tier deployments (specifically Render.com).
- SOLID principles, clean code, and treating documentation as a first-class citizen.

Your goal is to **evolve the [`RUT-Verifier-Bot`](https://github.com/Anfelroth69/RUT-Verifier-Bot) repository** from a monolithic CLI script into a production-ready **full-stack web platform**, maintaining strict compatibility with the existing automation core (Playwright + DIAN MUISCA).

**CRITICAL WORKFLOW RULE:** You must work in phases. Read this entire document to understand the context, but **ONLY execute Phase 1**. Stop and wait for my review and approval before proceeding to Phase 2.

---

## 🎯 MAIN OBJECTIVE

Build a **Colombian RUT verification web platform** consisting of:

1. **Backend** — REST API using FastAPI (Python).
2. **Frontend** — Web UI using Astro.js + Tailwind CSS.
3. **Worker** — Automation module using Playwright (refactored from the original script).
4. **Deployment** — Ready-to-deploy configuration for Render.com Free Tier.

---

## 📐 TARGET ARCHITECTURE

```text
rut-verifier-platform/
│
├── backend/                        # FastAPI — REST API + Playwright Worker
│   ├── app/
│   │   ├── main.py                 # FastAPI Entrypoint
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── routes/
│   │   │           ├── verify.py   # POST /api/v1/verify
│   │   │           └── health.py   # GET  /api/v1/health
│   │   ├── core/
│   │   │   ├── config.py           # Settings using Pydantic BaseSettings
│   │   │   └── logging.py          # Structured JSON logging
│   │   ├── schemas/
│   │   │   └── rut.py              # Pydantic models: RutRequest, RutResponse
│   │   ├── services/
│   │   │   └── rut_verifier.py     # Automation logic (refactored)
│   │   └── selectors.json          # Externalized CSS selectors
│   ├── Dockerfile
│   ├── render.yaml                 # Render.com service config
│   └── requirements.txt
│
├── frontend/                       # Astro.js — UI
│   ├── src/
│   │   ├── pages/
│   │   │   └── index.astro         # Main dashboard
│   │   ├── components/
│   │   │   ├── VerifyForm.astro    # Input form
│   │   │   ├── ResultCard.astro    # Result display card
│   │   │   └── StatusBadge.astro   # Visual status badge (success/error)
│   │   └── layouts/
│   │       └── Layout.astro        # Base layout
│   ├── astro.config.mjs
│   ├── tailwind.config.mjs
│   ├── package.json
│   ├── Dockerfile
│   └── render.yaml
│
├── AGENTS.md                       # AI Agent Guidelines (updated)
├── README.md                       # Comprehensive documentation
└── .env.example                    # Documented environment variables
```

---

## ✅ FUNCTIONAL REQUIREMENTS

### Backend (FastAPI)

- [ ] `POST /api/v1/verify` — Receives a National ID (cédula), executes the bot, and returns a JSON result.
- [ ] `GET /api/v1/health` — Healthcheck endpoint for Render.com.
- [ ] Input validation via Pydantic v2 (cédula: numeric only, 6–10 digits length).
- [ ] Structured response matching this exact schema:

```json
{
  "status": "success" | "failed",
  "rut_exists": true | false | null,
  "data": {
    "cedula_consultada": "16728423",
    "contenido_confirmado": "16728423"
  } | null,
  "message": "El RUT existe." | "La cédula consultada no tiene RUT." | "Error al procesar la solicitud.",
  "duration_ms": 4823
}
```

- [ ] HTTP Error handling: 422 (validation), 503 (bot failure), 500 (unexpected error).
- [ ] CORS explicitly configured to allow the frontend origin.
- [ ] Environment variables loaded via Pydantic `BaseSettings`.
- [ ] `headless=True` by default in production, configurable via `PLAYWRIGHT_HEADLESS`.

### Frontend (Astro.js)

- [ ] Single input form: "Número de cédula".
- [ ] Submit button with loading state (spinner).
- [ ] Clear result visualization:
  - ✅ RUT found → Green badge + confirmed data.
  - ❌ RUT not found → Red badge + message.
  - ⚠️ Error → Yellow badge + error message.
- [ ] Session history (LocalStorage, max 10 entries).
- [ ] Response time indicator (duration_ms).
- [ ] Mobile-first responsive design using pure Tailwind CSS.
- [ ] `PUBLIC_API_URL` environment variable to point to the backend.

---

## 🚫 TECHNICAL CONSTRAINTS

```text
ABSOLUTE RESTRICTIONS:
- STACK VERSIONS: You MUST use the absolute latest stable versions of all technologies in the stack. This includes Python 3.12+, FastAPI (latest), Pydantic v2, Astro.js (latest major), Tailwind CSS (latest), and Playwright (latest). Do NOT generate deprecated syntax or legacy dependencies.
- DO NOT use frontend frameworks other than Astro.js (No React, Vue, Next.js).
- DO NOT use a Database (Render.com Free Tier lacks free persistent DBs; MVP relies on LocalStorage).
- DO NOT hardcode credentials, URLs, or secrets in the source code.
- DO NOT break the bot's public interface (JSON response must maintain the original structure).
- DO NOT use external UI component libraries (No DaisyUI, Flowbite, etc.). Use pure Tailwind CSS.
- DO NOT use static `time.sleep()`. Always rely on Playwright's state-based waits.

INFRASTRUCTURE RESTRICTIONS (CRITICAL FOR RENDER FREE TIER):
- The backend must boot in under 60 seconds (cold start limit).
- Concurrency Limit: The backend MUST use a global `asyncio.Semaphore(1)` to ensure Playwright executes ONLY ONE query at a time, queuing the rest. This is critical to prevent Out of Memory (OOM) crashes in the 512MB Free Tier.
- Playwright Launch Args: When launching the Chromium browser, you MUST strictly include these optimization flags: `args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process']`.
- The backend Dockerfile must install Chromium along with Playwright OS dependencies.
```

---

## 🏗️ IMPLEMENTATION PHASES

### PHASE 1 — Backend Refactoring

**Task 1.1 — Modularize the original script**

Refactor the existing `rut_verifier.py` into `backend/app/services/rut_verifier.py` following these rules:
- IMPORTANT: FastAPI will inject the DIAN credentials (`document` and `password`) by reading them from `core/config.py` (server env vars), while the `cedula_consulta` will come exclusively from the user's HTTP POST payload.
- The `run()` method must be `async` using `async_playwright`.
- Add a `duration_ms` field to the payload measuring the total execution time.
- Remove all `time.sleep()` instances and replace them with native Playwright UI locators.

**Task 1.2 — Build the API**

Ensure the `POST /api/v1/verify` endpoint accurately handles the validation (422) and server errors (503), returning the predefined JSON schema.

**Task 1.3 — Backend Dockerfile**

```dockerfile
# Key instruction: Playwright in Docker requires system dependencies.
# Base image: [mcr.microsoft.com/playwright/python:v1.44.0-jammy](https://mcr.microsoft.com/playwright/python:v1.44.0-jammy) (or the absolute latest official python playwright image).
# Install command: playwright install chromium --with-deps
# Expose: port 8000
# CMD: uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

### PHASE 2 — Frontend with Astro.js

**Task 2.1 — Setup the project**

Initialize the Astro project inside the `frontend/` directory using the minimal template and strict TypeScript. Add Tailwind CSS.

**Task 2.2 — Main Component `VerifyForm.astro`**

- Controlled input with client-side validation (numbers only, 6-10 digits).
- Submit performs a `fetch` to: `POST {PUBLIC_API_URL}/api/v1/verify`.
- **Cold Start Handling (Render):** The `fetch` request must support long timeouts (up to 90 seconds).
- **Cold Start UX:** If the HTTP request takes longer than 5 seconds, dynamically display a friendly UI alert stating: *"El servidor se está despertando tras un periodo de inactividad, esto puede tomar un minuto..."* (The server is waking up from inactivity, this may take a minute).

**Task 2.3 & 2.4 — UI Components & Storage**

Build the `ResultCard.astro` displaying the status, and implement a TypeScript interface to handle LocalStorage history saving (max 10 records).

---

### PHASE 3 — Render.com Deployment

**Task 3.1 & 3.2 — `render.yaml` Generation**

Create the necessary `render.yaml` configurations. The Backend must be defined as a Docker `web` service (with healthcheck pointing to `/api/v1/health`), and the Frontend as a `static` web service running `npm run build`.

**Task 3.3 — Environment Variables**

Generate a well-documented `.env.example`.

---

## 📋 ACCEPTANCE CRITERIA

The implementation is ONLY valid if it meets ALL the following criteria:

```text
MUST HAVE:
  ✅ Uses the latest stable versions for Python, FastAPI, Pydantic, Astro, and Tailwind CSS.
  ✅ POST /api/v1/verify returns the exact expected JSON schema.
  ✅ GET /api/v1/health returns HTTP 200.
  ✅ Backend utilizes `asyncio.Semaphore(1)` to enforce a single Chromium instance at a time.
  ✅ Playwright is launched with memory-optimization flags (`--disable-dev-shm-usage`, etc.).
  ✅ CORS is properly configured allowing frontend origin.
  ✅ Credentials are read strictly from server environment variables.
  ✅ Frontend gracefully handles and notifies the user about Cold Starts.
  ✅ Search history persists in LocalStorage.

MUST NOT:
  ❌ NO credentials hardcoded in the source files.
  ❌ NO deprecated code (e.g., old Pydantic v1 syntax or outdated Astro components).
  ❌ NO headless=False used in the production Dockerfile.
  ❌ NO `/verify` requests processed without prior cédula format validation.
```