# RUT Verifier Platform

Plataforma full-stack para la verificación automática de RUT en la DIAN.

## Arquitectura
- **Backend**: FastAPI + Playwright (Dockerizado).
- **Frontend**: Astro.js + Tailwind CSS v4.
- **Despliegue**: Render.com Free Tier.

## Despliegue en Render
Este repositorio incluye `render.yaml`. Simplemente conecta este repo a Render y la plataforma se desplegará automáticamente.

### Variables de entorno requeridas en Render:
- `DIAN_DOCUMENT`: Tu número de documento DIAN.
- `DIAN_PASSWORD`: Tu contraseña DIAN.

## Desarrollo Local
1. **Backend**:
   - `cd backend`
   - `pip install -r requirements.txt`
   - `uvicorn app.main:app --reload`
2. **Frontend**:
   - `cd frontend`
   - `pnpm install`
   - `pnpm run dev`
