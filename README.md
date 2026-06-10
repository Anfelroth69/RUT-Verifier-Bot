# RUT Verifier Platform

Plataforma full-stack para la verificación automática de RUT en la DIAN.

---

## ⚠️ Exención de Responsabilidad

Este proyecto es una herramienta de automatización desarrollada con fines educativos, de investigación, aprendizaje y optimización de flujos de trabajo.

No está afiliado, respaldado, patrocinado ni mantenido por la Dirección de Impuestos y Aduanas Nacionales (DIAN) ni por ninguna entidad gubernamental de la República de Colombia.

El software se proporciona "tal cual", sin garantías de ningún tipo. El usuario es responsable de verificar que su uso cumple con la legislación aplicable, los términos de servicio de las plataformas involucradas y las políticas de su organización.

Los autores y colaboradores no asumen responsabilidad por daños, pérdidas, bloqueos de cuentas o cualquier consecuencia derivada del uso de este proyecto.

---

## Arquitectura

*   **Backend**: FastAPI + Playwright (Dockerizado). Implementa un semáforo de concurrencia `asyncio.Semaphore(1)` para optimizar el consumo de memoria en entornos con recursos limitados.
*   **Frontend**: Astro.js + Tailwind CSS v4. Interfaz interactiva y responsiva con almacenamiento de historial de búsquedas local en `LocalStorage`.
*   **Despliegue**: Orquestación unificada para Render.com Free Tier mediante `render.yaml`.

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
2. Crear un entorno virtual:
   ```bash
   python -m venv venv
   ```
3. Activar el entorno virtual:
   *   **Linux/macOS**: `source venv/bin/activate`
   *   **Windows**: `venv\Scripts\activate`
4. Instalar las dependencias y los binarios de Playwright:
   ```bash
   pip install -r requirements.txt
   playwright install chromium
   ```
5. Crear un archivo `.env` en la raíz del directorio `/backend`:
   ```env
   DIAN_DOCUMENT=TuDocumento
   DIAN_PASSWORD=TuContraseña
   PLAYWRIGHT_HEADLESS=True
   FRONTEND_URL=http://localhost:4321
   ```
6. Iniciar el servidor de desarrollo:
   ```bash
   uvicorn app.main:app --reload
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

---

## Seguridad

*   Los archivos de credenciales locales (`.env`) están incluidos en el `.gitignore` y nunca deben subirse al repositorio.
*   No se almacenan registros ni historiales de consultas en el servidor externo; las búsquedas se guardan localmente en el navegador del usuario final.

---

## Licencia

Este proyecto está licenciado bajo la licencia MIT. Consulta el archivo `LICENSE` para más información.
