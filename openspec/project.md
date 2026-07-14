# RUT Verifier Platform — OpenSpec Project

## Overview

Plataforma full-stack para la verificación automática de RUT (Registro Único Tributario) en el portal DIAN MUISCA.

## Stack

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | Astro.js + TypeScript + Tailwind CSS v4 | 6.x |
| Data Fetching | TanStack React Query v5 | 5.x |
| Backend | Hono (TypeScript) | Latest |
| Automation | Playwright (Node.js) | Latest |
| Testing | Vitest + @testing-library/react + MSW | Latest |
| Deployment | Render.com Free Tier (Docker) | — |

## Architecture

```
┌──────────────┐     HTTP/REST      ┌──────────────┐     Playwright     ┌──────────────┐
│   Frontend   │ ◄────────────────► │   Backend    │ ◄────────────────► │  DIAN MUISCA │
│  Astro.js    │                    │    Hono      │                    │   Portal     │
│  Tailwind v4 │                    │  TypeScript  │                    │              │
└──────────────┘                    └──────────────┘                    └──────────────┘
     Static                           Docker (512MB)                      Angular Material
     render.com                       BrowserManager                     JSF
```

## Constraints

- **512MB RAM**: Playwright must launch with `--no-sandbox --disable-dev-shm-usage --disable-gpu --single-process`
- **Concurrency**: `BrowserManager` singleton manages persistent Chromium with page-per-request isolation
- **No waitForTimeout()**: All waits must be state-based via Playwright locators (exception: JSF polling with adaptive delays)
- **Locale**: `es-CO` with `Accept-Language: es-CO,es;q=0.9`
- **No Database**: History stored in browser LocalStorage (max 10 entries)

## Secrets

| Variable | Purpose | Location |
|----------|---------|----------|
| `DIAN_DOCUMENT` | DIAN login document number | Server env |
| `DIAN_PASSWORD` | DIAN login password | Server env |
| `PUBLIC_API_URL` | Backend URL for frontend | Build-time env |

Never hardcode. Never commit `.env`.

## Specs

| Spec | Path | Description |
|------|------|-------------|
| Backend | `specs/backend/spec.md` | Hono API + Playwright automation |
| Frontend | `specs/frontend/spec.md` | Astro.js UI + React Query |
| Automation | `specs/automation/spec.md` | Playwright selectors + DIAN flow |
