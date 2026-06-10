import os
import json
import logging
import re
import time
from typing import Dict, Any
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
from app.core.config import settings

logger = logging.getLogger(__name__)

class DianRutVerifier:
    def __init__(self):
        self.document = settings.DIAN_DOCUMENT
        self.password = settings.DIAN_PASSWORD
        self.headless = settings.PLAYWRIGHT_HEADLESS
        
        self.selectors_file = os.path.join(os.path.dirname(__file__), "..", "selectors.json")
        if not os.path.exists(self.selectors_file):
            logger.error(f"❌ ERROR CRÍTICO: No se encontró el archivo de selectores '{self.selectors_file}'")
            raise FileNotFoundError(f"Por favor crea el archivo {self.selectors_file}.")
            
        with open(self.selectors_file, "r", encoding="utf-8") as f:
            self.SELECTORS = json.load(f)
        
        self.login_url = "https://muisca.dian.gov.co/WebIdentidadLogin"
        self.search_url = "https://muisca.dian.gov.co/WebArquitectura/DefConsultaPersonas.faces"

    async def run(self, cedula_consulta: str) -> Dict[str, Any]:
        start_time = time.time()
        result = {"status": "failed", "rut_exists": None, "data": None, "message": "", "duration_ms": 0}
        
        async with async_playwright() as p:
            # OPTIMIZATION: Critical launch arguments for Render Free Tier (512MB RAM)
            browser = await p.chromium.launch(
                headless=self.headless,
                args=[
                    '--no-sandbox', 
                    '--disable-dev-shm-usage', 
                    '--disable-gpu', 
                    '--single-process'
                ]
            ) 
            
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36",
                permissions=[],
                locale="es-CO",  
                extra_http_headers={
                    "Accept-Language": "es-CO,es;q=0.9"  
                }
            )
            page = await context.new_page()

            try:
                # ==========================================
                # FASE 1: AUTENTICACIÓN 
                # ==========================================
                logger.info(f"[{cedula_consulta}] Iniciando Fase 1: Autenticación...")
                await page.goto(self.login_url, wait_until="domcontentloaded", timeout=45000)
                
                logger.info(f"[{cedula_consulta}] Esperando que el formulario de la DIAN sea visible en el DOM...")
                selector_doc = page.locator(self.SELECTORS["auth"]["doc_type_trigger"])
                await selector_doc.wait_for(state="visible", timeout=20000)
                
                # 1. Limpiar modal de "Notificaciones"
                texto_notif = self.SELECTORS["auth"]["modal_notifications_text"]
                if await page.locator(f"text={texto_notif}").is_visible() or await page.locator(self.SELECTORS["auth"]["modal_notifications"]).is_visible():
                    logger.warning(f"[{cedula_consulta}] ⚠️ Se detectó el modal superior de 'Notificaciones'. Despejando...")
                    boton_continuar = page.locator(self.SELECTORS["auth"]["modal_notifications_btn"]).first
                    if await boton_continuar.is_visible():
                        await boton_continuar.click()
                    else:
                        await page.keyboard.press("Escape")
                    
                    # Wait for it to disappear instead of static timeout
                    try:
                        await page.locator(self.SELECTORS["auth"]["modal_notifications"]).wait_for(state="hidden", timeout=3000)
                    except PlaywrightTimeoutError:
                        pass # Ignore if hidden check times out, proceed anyway

                # 2. Limpiar modal de "Ingreso Incorrecto"
                if await page.locator(self.SELECTORS["auth"]["modal_error_login"]).is_visible():
                    logger.warning(f"[{cedula_consulta}] ⚠️ Se detectó el modal de 'Ingreso Incorrecto'. Cerrándolo...")
                    await page.keyboard.press("Escape")
                    
                    # Instead of hard sleep, check visibility and click X if still there
                    if await page.locator(self.SELECTORS["auth"]["modal_error_login"]).is_visible():
                        logger.info(f"[{cedula_consulta}] Forzando clic en el botón 'X' del modal...")
                        boton_x = page.locator(self.SELECTORS["auth"]["modal_error_login_close"]).first
                        if await boton_x.is_visible():
                            await boton_x.click(force=True)
                    
                    await page.locator(self.SELECTORS["auth"]["modal_error_login"]).wait_for(state="hidden", timeout=5000)
                    logger.info(f"[{cedula_consulta}] ✅ Todos los modales han sido removidos exitosamente.")

                # --- Llenado del Formulario ---
                logger.info(f"[{cedula_consulta}] Desplegando el selector de tipo de documento...")
                await selector_doc.click()
                
                # Esperar a que el panel desplegable de opciones de Angular exista y sea visible
                await page.wait_for_selector(".mat-select-panel", state="visible", timeout=5000)
                # Wait for the specific option to be visible instead of static timeout
                opcion_cedula = page.locator(f"{self.SELECTORS['auth']['doc_type_options']}:has-text('Cédula de ciudadanía')").first
                await opcion_cedula.wait_for(state="visible", timeout=5000)

                logger.info(f"[{cedula_consulta}] Seleccionando la opción EXACTA 'Cédula de ciudadanía'...")
                await opcion_cedula.click(force=True) 

                logger.info(f"[{cedula_consulta}] Ingresando Número de Documento...")
                await page.locator(self.SELECTORS["auth"]["input_username"]).fill(self.document)

                logger.info(f"[{cedula_consulta}] Ingresando Contraseña...")
                await page.locator(self.SELECTORS["auth"]["input_password"]).fill(self.password)
                
                logger.info(f"[{cedula_consulta}] Aceptando Tratamiento de Datos...")
                await page.locator(self.SELECTORS["auth"]["checkbox_terms"]).click()
                
                logger.info(f"[{cedula_consulta}] Esperando validación del formulario y haciendo clic en Ingresar...")
                # Wait for button to not be disabled (common in Angular forms after filling required fields)
                btn_submit = page.locator(self.SELECTORS["auth"]["btn_submit"])
                await btn_submit.wait_for(state="visible")
                await btn_submit.click()
                
                await page.wait_for_load_state("domcontentloaded")
                
                # Check for login failure indicator or successful redirect
                try:
                    # Wait for either the search url or an error message
                    async with page.expect_navigation(timeout=10000):
                         pass
                except PlaywrightTimeoutError:
                    if "IdentidadLogin" in page.url:
                        raise Exception("Fallo en login. Verifique sus credenciales o estado del portal.")

                # ==========================================
                # FASE 2: NAVEGACIÓN A CONSULTA
                # ==========================================
                logger.info(f"[{cedula_consulta}] Login exitoso. Fase 2: Navegando al módulo de consulta...")
                await page.goto(self.search_url, wait_until="domcontentloaded")

                # ==========================================
                # FASE 3: EJECUCIÓN DE BÚSQUEDA (MUISCA JSF)
                # ==========================================
                logger.info(f"[{cedula_consulta}] Fase 3: Ejecutando búsqueda para la cédula global: {cedula_consulta}")
                
                input_jsf_cedula = page.locator(self.SELECTORS["search"]["input_target_cedula"])
                await input_jsf_cedula.wait_for(state="visible", timeout=15000)
                await input_jsf_cedula.fill(cedula_consulta)
                
                logger.info(f"[{cedula_consulta}] Haciendo clic en el botón de búsqueda JSF...")
                boton_buscar_jsf = page.locator(self.SELECTORS["search"]["btn_search_jsf"])
                await boton_buscar_jsf.click()

                # ==========================================
                # FASE 4: INTERPRETACIÓN DE RESULTADOS
                # ==========================================
                logger.info(f"[{cedula_consulta}] Fase 4: Esperando y evaluando el contenido de la respuesta...")
                
                selector_exito = page.locator(self.SELECTORS["results"]["span_success"]).first
                patron_no_existe = re.compile(r"no tiene registro de inscripci[oó]n", re.IGNORECASE)
                selector_error = page.locator(self.SELECTORS["results"]["body"]).filter(has_text=patron_no_existe)
                
                # We need polling here because the JSF page dynamically updates the DOM 
                # without full page loads in some legacy interactions.
                max_intentos = 30
                evaluacion_completa = False
                
                for intento in range(max_intentos):
                    if await selector_exito.is_visible():
                        texto_interno = await selector_exito.inner_text()
                        texto_interno = texto_interno.strip()
                        
                        if re.search(r'\d+', texto_interno):
                            logger.info(f"[{cedula_consulta}] ✅ ¡Etiqueta válida con campo numérico detectada: '{texto_interno}'!")
                            result["status"] = "success"
                            result["rut_exists"] = True
                            result["data"] = {
                                "cedula_consultada": cedula_consulta,
                                "contenido_confirmado": texto_interno
                            }
                            result["message"] = "El RUT existe."
                            evaluacion_completa = True
                            break
                    
                    if await selector_error.is_visible():
                        logger.info(f"[{cedula_consulta}] ❌ Modal de error de no inscripción detectado en pantalla.")
                        result["status"] = "success"
                        result["rut_exists"] = False
                        result["message"] = "Confirmada ausencia de RUT a través del modal de la DIAN."
                        evaluacion_completa = True
                        break
                    
                    await page.wait_for_timeout(500)
                
                if not evaluacion_completa and await selector_exito.is_visible():
                    texto_final = await selector_exito.inner_text()
                    texto_final = texto_final.strip()
                    if not re.search(r'\d+', texto_final):
                        logger.warning(f"[{cedula_consulta}] ⚠️ La etiqueta se renderizó pero permaneció vacía o sin datos numéricos.")
                        result["status"] = "success"
                        result["rut_exists"] = False
                        result["message"] = f"La cédula {cedula_consulta} NO tiene RUT."
                        evaluacion_completa = True

                if not evaluacion_completa:
                    raise Exception("Timeout de red: El servidor de la DIAN no arrojó ninguna estructura reconocible.")

            except PlaywrightTimeoutError:
                result["message"] = "Timeout esperando respuesta o interacción con la plataforma de la DIAN."
                logger.error(f"[{cedula_consulta}] {result['message']}")
            except Exception as e:
                result["message"] = str(e)
                logger.error(f"[{cedula_consulta}] Error en el proceso: {e}")
            finally:
                logger.info(f"[{cedula_consulta}] Cerrando navegador...")
                await browser.close()
                
            end_time = time.time()
            result["duration_ms"] = int((end_time - start_time) * 1000)
            return result
