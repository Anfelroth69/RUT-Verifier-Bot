#!/bin/bash

# RUT Verifier Platform - Script de inicio
# Levanta backend (Hono) y frontend (Astro.js + TanStack)

set -e

echo "🚀 Iniciando RUT Verifier Platform..."
echo ""

# Matar procesos anteriores en los puertos
echo "Limpiando puertos anteriores..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:4321 | xargs kill -9 2>/dev/null || true
sleep 1

# Iniciar Backend
echo "📦 Iniciando Backend (Hono + Playwright) en puerto 8000..."
cd "$(dirname "$0")/backend"
npx tsx src/index.ts &
BACKEND_PID=$!
cd ..

# Esperar a que el backend esté listo
echo "⏳ Esperando a que el backend esté listo..."
for i in {1..15}; do
  if curl -s http://localhost:8000/api/v1/health > /dev/null 2>&1; then
    echo "✅ Backend listo!"
    break
  fi
  sleep 1
done

# Iniciar Frontend
echo "🎨 Iniciando Frontend (Astro.js + TanStack) en puerto 4321..."
cd "$(dirname "$0")/frontend"
pnpm dev &
FRONTEND_PID=$!
cd ..

# Esperar a que el frontend esté listo
echo "⏳ Esperando a que el frontend esté listo..."
for i in {1..20}; do
  if curl -s http://localhost:4321 > /dev/null 2>&1; then
    echo "✅ Frontend listo!"
    break
  fi
  sleep 1
done

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ RUT Verifier Platform corriendo!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:4321"
echo ""
echo "  PIDs: Backend=$BACKEND_PID, Frontend=$FRONTEND_PID"
echo ""
echo "  Para detener: kill $BACKEND_PID $FRONTEND_PID"
echo "  O presiona Ctrl+C"
echo "═══════════════════════════════════════════════════"
echo ""

# Mantener el script vivo
wait
