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

### Backend
1. `cd backend`
2. `python -m venv venv`
3. `source venv/bin/activate` # O `venv\Scripts\activate` en Windows
4. `pip install -r requirements.txt`
5. `uvicorn app.main:app --reload`

### Frontend
1. `cd frontend`
2. `pnpm install`
3. `pnpm run dev`
