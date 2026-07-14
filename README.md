# RUT Verifier Platform

Plataforma full-stack para la verificación automática de RUT en la DIAN.

---

## Exención de Responsabilidad

Este proyecto es una herramienta de automatización desarrollada con fines educativos, de investigación, aprendizaje y optimización de flujos de trabajo.

No está afiliado, respaldado, patrocinado ni mantenido por la Dirección de Impuestos y Aduanas Nacionales (DIAN) ni por ninguna entidad gubernamental de la República de Colombia.

El software se proporciona "tal cual", sin garantías de ningún tipo. El usuario es responsable de verificar que su uso cumple con la legislación aplicable, los términos de servicio de las plataformas involucradas y las políticas de su organización.

Los autores y colaboradores no asumen responsabilidad por daños, pérdidas, bloqueos de cuentas o cualquier consecuencia derivada del uso de este proyecto.

---

## Arquitectura

*   **Backend**: Hono (TypeScript) + Playwright. BrowserManager singleton mantiene una instancia persistente de Chromium con control de concurrencia y timeout de inactividad (5 min).
*   **Frontend**: Astro.js + Tailwind CSS v4. Interfaz interactiva y responsiva con almacenamiento de historial de búsquedas local en `LocalStorage`.
*   **Testing**: Vitest para unit tests del backend.
*   **Despliegue**: Docker en Render.com Free Tier (512MB RAM) mediante `render.yaml`.

### BrowserManager

El `BrowserManager` (`backend/src/core/browser-manager.ts`) reemplaza el semaphore anterior:

- Mantiene un browser Chromium persistente entre requests
- Cada request adquiere un `{ page, context }` fresco via `acquire()`
- El browser solo se cierra en shutdown del servidor o tras 5 min de inactividad
- Detección de crashes: si el browser se desconecta, se relanza en el próximo `acquire()`

---

## Despliegue en Render

Este repositorio incluye `render.yaml`. Al conectar este repositorio a su cuenta de Render, la plataforma se desplegará de forma automática.

### Variables de entorno requeridas en Render:
*   `DIAN_DOCUMENT`: Tu número de documento de acceso a la DIAN.
*   `DIAN_PASSWORD`: Tu contraseña de acceso a la DIAN.

---

## Desarrollo Local

### Backend

1. Ir al directorio del backend:
   ```bash
   cd backend
   ```
2. Instalar dependencias:
   ```bash
   pnpm install
   ```
3. Instalar binarios de Playwright:
   ```bash
   pnpm exec playwright install chromium
   ```
4. Crear un archivo `.env` en la raíz del directorio `/backend`:
   ```env
   DIAN_DOCUMENT=TuDocumento
   DIAN_PASSWORD=TuContraseña
   PLAYWRIGHT_HEADLESS=True
   FRONTEND_URL=http://localhost:4321
   ```
5. Iniciar el servidor de desarrollo:
   ```bash
   pnpm run dev
   ```

### Frontend

1. Ir al directorio del frontend:
   ```bash
   cd frontend
   ```
2. Instalar las dependencias:
   ```bash
   pnpm install
   ```
3. Iniciar el servidor de desarrollo:
   ```bash
   pnpm run dev
   ```

### Tests

```bash
cd backend
pnpm run test
```

---

## Seguridad

*   Los archivos de credenciales locales (`.env`) están incluidos en el `.gitignore` y nunca deben subirse al repositorio.
*   No se almacenan registros ni historiales de consultas en el servidor externo; las búsquedas se guardan localmente en el navegador del usuario final.

---

## Licencia

Este proyecto está licenciado bajo la licencia MIT. Consulta el archivo `LICENSE` para más información.
