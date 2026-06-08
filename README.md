# RUT Verifier Bot 🤖

Automatización desarrollada en Python y Playwright para verificar la existencia de un Registro Único Tributario (RUT) asociado a una cédula de ciudadanía mediante interacción automatizada con el portal MUISCA de la DIAN.

## ⚠️ Exención de Responsabilidad

Este proyecto es una herramienta de automatización desarrollada con fines educativos, de investigación, aprendizaje y optimización de flujos de trabajo.

No está afiliado, respaldado, patrocinado ni mantenido por la Dirección de Impuestos y Aduanas Nacionales (DIAN) ni por ninguna entidad gubernamental de la República de Colombia.

El software se proporciona "tal cual", sin garantías de ningún tipo. El usuario es responsable de verificar que su uso cumple con la legislación aplicable, los términos de servicio de las plataformas involucradas y las políticas de su organización.

Los autores y colaboradores no asumen responsabilidad por daños, pérdidas, bloqueos de cuentas o cualquier consecuencia derivada del uso de este proyecto.

---

## Características

* Automatización de navegación mediante Playwright.
* Inicio de sesión en MUISCA utilizando credenciales configuradas por el usuario.
* Consulta automatizada de existencia de RUT.
* Manejo robusto de ventanas emergentes y mensajes del sistema.
* Compatibilidad con Windows, Linux y macOS.
* Configuración mediante variables de entorno.
* Salida estructurada en formato JSON para facilitar integraciones futuras.

---

## Ejemplo de Resultado

### RUT encontrado

```json
{
  "status": "success",
  "rut_exists": true,
  "data": {
    "cedula_consultada": "16728423",
    "contenido_confirmado": "16728423"
  },
  "message": "El RUT existe."
}
```

### RUT no encontrado

```json
{
  "status": "success",
  "rut_exists": false,
  "data": null,
  "message": "La cédula consultada no tiene RUT."
}
```

---

## Requisitos

* Python 3.8 o superior
* Playwright
* Chromium

Verificar versión de Python:

```bash
python --version
```

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/Anfelroth69/RUT-Verifier-Bot.git
cd RUT-Verifier-Bot
```

### 2. Crear un entorno virtual

#### Linux / macOS

```bash
python -m venv venv
source venv/bin/activate
```

#### Windows

```powershell
python -m venv venv
venv\Scripts\activate
```

### 3. Instalar dependencias

Si tienes un archivo `requirements.txt`:

```bash
pip install -r requirements.txt
```

En caso contrario:

```bash
pip install playwright python-dotenv
```

### 4. Instalar Chromium

```bash
playwright install chromium
```

---

## Configuración

Crear un archivo `.env` en la raíz del proyecto:

```env
DIAN_DOCUMENT=123456789
DIAN_PASSWORD=MiPassword
CEDULA_CONSULTA=987654321
```

### Variables de entorno

| Variable        | Descripción                                       |
| --------------- | ------------------------------------------------- |
| DIAN_DOCUMENT   | Documento utilizado para iniciar sesión en MUISCA |
| DIAN_PASSWORD   | Contraseña de acceso a MUISCA                     |
| CEDULA_CONSULTA | Cédula que será consultada                        |

---

## Uso

Ejecutar el script principal:

```bash
python dian_rut_checker.py
```

El navegador Chromium se abrirá automáticamente y realizará el proceso de consulta.

---

## Arquitectura General

```text
RUT-Verifier-Bot/
├── dian_rut_checker.py
├── README.md
├── requirements.txt
├── .gitignore
└── .env
```

Esta es una versión inicial del proyecto. En futuras versiones puede evolucionar hacia una arquitectura modular separando la lógica de automatización, configuración, validación y manejo de errores.

---

## Seguridad

### Recomendaciones

* Nunca publiques tu archivo `.env`.
* Nunca compartas credenciales de acceso a MUISCA.
* Mantén `.env` incluido en `.gitignore`.
* Utiliza credenciales con acceso controlado cuando sea posible.
* Considera rotar las credenciales periódicamente.

### Verificación antes de publicar

Asegúrate de que el repositorio no contenga:

```text
.env
.env.local
credentials.json
secrets.json
```

Ni valores sensibles embebidos directamente en el código fuente.

---

## Limitaciones

* El funcionamiento depende de la estructura actual del portal MUISCA.
* Cambios en la interfaz o en el flujo de autenticación pueden requerir ajustes en el script.
* El rendimiento puede variar según la disponibilidad y respuesta de los servicios externos.
* La automatización puede verse afectada por mecanismos anti-bot implementados por terceros.

---

## Roadmap

* [ ] Modularizar la aplicación.
* [ ] Añadir pruebas automatizadas.
* [ ] Implementar logging estructurado.
* [ ] Mejorar manejo de errores.
* [ ] Exponer funcionalidad mediante API REST.


---

## Contribuciones

Las contribuciones son bienvenidas.

Si deseas colaborar:

1. Haz un fork del repositorio.
2. Crea una rama para tu funcionalidad.
3. Envía un Pull Request describiendo claramente los cambios realizados.

---

## Licencia

Este proyecto está licenciado bajo la licencia MIT.

Consulta el archivo `LICENSE` para más información.
