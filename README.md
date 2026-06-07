# RUT Verifier Bot 🤖

Este es un bot de automatización desarrollado en Python utilizando **Playwright**. Su objetivo principal es interactuar de manera segura con el portal MUISCA de la DIAN (Dirección de Impuestos y Aduanas Nacionales de Colombia) para verificar si una cédula de ciudadanía específica cuenta con un Registro Único Tributario (RUT) activo.

## ⚠️ Exención de Responsabilidad (Disclaimer)
> **IMPORTANTE:** Este proyecto fue desarrollado exclusivamente con fines educativos, de automatización de pruebas de software y optimización personal de flujos de trabajo. No guarda ninguna relación oficial, endoso, patrocinio ni vinculación con la DIAN ni con ninguna entidad gubernamental o de control de la República de Colombia. El uso de este script es responsabilidad única del usuario.

## Características Principales

* **Manejador Defensivo de Modales:** Detecta y remueve automáticamente ventanas flotantes del sistema en cascada, como los avisos de "Notificaciones" del navegador o alertas de "Ingreso Incorrecto".
* **Blindaje Regional Extendido:** Fuerza la localización del contexto de navegación a `es-CO` e inyecta encabezados `Accept-Language` explícitos. Esto evita que el proxy de la DIAN intente traducir la ruta a inglés (`/WebArchitecture/`), lo que causaría un error `404 Not Found` en entornos Windows.
* **Monitoreo Dinámico (Polling Loop):** Implementa un bucle de verificación activa durante un máximo de 15 segundos (30 intentos cada 500ms). Esto inmuniza al bot contra el lag o el retraso asíncrono de las peticiones AJAX de JSF.
* **Validación Numérica Estricta:** Extrae el contenido de la etiqueta exacta `<span class="textoNegro"></span>` y evalúa mediante expresiones regulares si contiene dígitos. Si la etiqueta se renderiza vacía o sin números, dictamina con seguridad que el usuario no posee RUT.

## 🛠️ Requisitos Previos

Asegúrate de tener instalado Python 3.8 o superior en tu máquina. Puedes verificarlo corriendo el siguiente comando en tu terminal:

```bash
python --version
```

## 📦 Instalación y Configuración

Sigue estos pasos detallados para preparar el entorno tanto en Windows como en entornos Linux:

1. **Clonar el repositorio:**
   Clona este proyecto en tu máquina local y posiciónate dentro del directorio de trabajo:
   ```bash
   git clone [https://github.com/TU_USUARIO/dian-rut-verifier.git](https://github.com/TU_USUARIO/dian-rut-verifier.git)
   cd dian-rut-verifier
   ```

2. **Instalar dependencias de Python:**
   Usa el gestor de paquetes `pip` para instalar la librería de automatización de navegadores y el lector de archivos de configuración:
   ```bash
   pip install playwright python-dotenv
   ```

3. **Descargar los binarios del navegador (Chromium):**
   * **En Windows (PowerShell):**
     ```powershell
     python -m playwright install chromium
     ```
   * **En Linux o macOS (Terminal):**
     ```bash
     playwright install chromium
     ```

4. **Crear y configurar el entorno privado (.env):**
   Crea un archivo de texto plano llamado `.env` en la raíz del proyecto. 
   
   *⚠️ **Nota para Windows:** Asegúrate al guardar el archivo que la codificación (Encoding) sea estrictamente **UTF-8** (sin BOM) para prevenir que caracteres invisibles rompan la lectura de las variables.*
   
   Escribe los siguientes parámetros reemplazando con tus datos reales:
   ```env
   DIAN_DOCUMENT=TuCedulaDeAcceso
   DIAN_PASSWORD=TuContraseñaMuisca
   CEDULA_CONSULTA=CedulaQueDeseasConsultar
   ```

## 🚀 Uso

Con el entorno configurado y las dependencias listas, puedes arrancar el bot de la siguiente manera:

1. Abre tu terminal (PowerShell en Windows o tu shell preferida en Linux).
2. Asegúrate de estar en la carpeta raíz del proyecto.
3. Ejecuta el script principal:

```bash
python dian_rut_checker.py
```

*El bot iniciará levantando una instancia controlada de Chromium en modo visible (headless=False) para que puedas visualizar la limpieza de modales y la navegación por las distintas fases de la DIAN automáticamente.*

## 📊 Estructura del Reporte Final

Al finalizar la consulta, el script cerrará todas las sesiones del navegador de manera segura e imprimirá un objeto JSON estructurado directamente en la consola con el veredicto definitivo:

**Caso A: El usuario tiene un RUT activo en el sistema**
```json
{
    "status": "success",
    "rut_exists": true,
    "data": {
        "cedula_consultada": "16728423",
        "contenido_confirmado": "16728423"
    },
    "message": "El RUT existe (etiqueta con información numérica presente)."
}
```

**Caso B: El usuario NO cuenta con registro o la consulta resultó vacía**
```json
{
    "status": "success",
    "rut_exists": false,
    "data": null,
    "message": "La cédula 16728423 NO tiene RUT."
}
```
