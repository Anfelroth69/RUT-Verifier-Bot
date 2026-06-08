import os
import json
import logging
import re
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

# Configuración de logs
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

load_dotenv()

class DianRutVerifier:
    def __init__(self):
        self.document = os.getenv("DIAN_DOCUMENT")
        self.password = os.getenv("DIAN_PASSWORD")
        self.cedula_consulta = os.getenv("CEDULA_CONSULTA")
        
        if not self.document or not self.password or not self.cedula_consulta:
            logging.error("❌ ERROR CRÍTICO: No se pudieron cargar las variables desde el archivo .env")
            raise ValueError("Revisa la codificación UTF-8 o la ubicación de tu archivo .env")
        
        self.selectors_file = "selectors.json"
        if not os.path.exists(self.selectors_file):
            logging.error(f"❌ ERROR CRÍTICO: No se encontró el archivo de selectores '{self.selectors_file}'")
            raise FileNotFoundError(f"Por favor crea el archivo {self.selectors_file} en la raíz.")
            
        with open(self.selectors_file, "r", encoding="utf-8") as f:
            self.SELECTORS = json.load(f)
        
        self.login_url = "https://muisca.dian.gov.co/WebIdentidadLogin"
        self.search_url = "https://muisca.dian.gov.co/WebArquitectura/DefConsultaPersonas.faces"

    def run(self):
        result = {"status": "failed", "rut_exists": None, "data": None, "message": ""}
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False) 
            
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36",
                permissions=[],
                locale="es-CO",  
                extra_http_headers={
                    "Accept-Language": "es-CO,es;q=0.9"  
                }
            )
            page = context.new_page()

            try:
                # ==========================================
                # FASE 1: AUTENTICACIÓN 
                # ==========================================
                logging.info("Iniciando Fase 1: Autenticación...")
                page.goto(self.login_url, wait_until="domcontentloaded", timeout=45000)
                
                logging.info("Esperando que el formulario de la DIAN sea visible en el DOM...")
                selector_doc = page.locator(self.SELECTORS["auth"]["doc_type_trigger"])
                selector_doc.wait_for(state="visible", timeout=20000)
                page.wait_for_timeout(1500) 
                
                # 1. Limpiar modal de "Notificaciones"
                texto_notif = self.SELECTORS["auth"]["modal_notifications_text"]
                if page.locator(f"text={texto_notif}").is_visible() or page.locator(self.SELECTORS["auth"]["modal_notifications"]).is_visible():
                    logging.warning("⚠️ Se detectó el modal superior de 'Notificaciones'. Despejando...")
                    boton_continuar = page.locator(self.SELECTORS["auth"]["modal_notifications_btn"]).first
                    if boton_continuar.is_visible():
                        boton_continuar.click()
                    else:
                        page.keyboard.press("Escape")
                    page.wait_for_timeout(600) 

                # 2. Limpiar modal de "Ingreso Incorrecto"
                if page.locator(self.SELECTORS["auth"]["modal_error_login"]).is_visible():
                    logging.warning("⚠️ Se detectó el modal de 'Ingreso Incorrecto'. Cerrándolo...")
                    page.keyboard.press("Escape")
                    page.wait_for_timeout(500)
                    
                    if page.locator(self.SELECTORS["auth"]["modal_error_login"]).is_visible():
                        logging.info("Forzando clic en el botón 'X' del modal...")
                        boton_x = page.locator(self.SELECTORS["auth"]["modal_error_login_close"]).first
                        if boton_x.is_visible():
                            boton_x.click(force=True)
                    
                    page.locator(self.SELECTORS["auth"]["modal_error_login"]).wait_for(state="hidden", timeout=5000)
                    logging.info("✅ Todos los modales han sido removidos exitosamente.")

                # --- Llenado del Formulario ---
                logging.info("Desplegando el selector de tipo de documento...")
                selector_doc.click()
                
                # 🔄 OPTIMIZACIÓN AQUÍ: Esperar a que el panel desplegable de opciones de Angular exista y sea visible
                page.wait_for_selector(".mat-select-panel", state="visible", timeout=5000)
                page.wait_for_timeout(300) # Buffer para la animación CSS de despliegue

                logging.info("Seleccionando la opción EXACTA 'Cédula de ciudadanía'...")
                # Usamos una estrategia combinada directa sobre la opción de Angular que contiene el texto
                opcion_cedula = page.locator(f"{self.SELECTORS['auth']['doc_type_options']}:has-text('Cédula de ciudadanía')").first
                opcion_cedula.wait_for(state="visible", timeout=5000)
                opcion_cedula.click(force=True) # Forzamos el click para saltarnos bloqueos de capas invisibles de animación
                page.wait_for_timeout(300)

                logging.info("Ingresando Número de Documento...")
                page.locator(self.SELECTORS["auth"]["input_username"]).fill(self.document)

                logging.info("Ingresando Contraseña...")
                page.locator(self.SELECTORS["auth"]["input_password"]).fill(self.password)
                
                logging.info("Aceptando Tratamiento de Datos...")
                page.locator(self.SELECTORS["auth"]["checkbox_terms"]).click()
                
                logging.info("Esperando validación del formulario y haciendo clic en Ingresar...")
                page.locator(self.SELECTORS["auth"]["btn_submit"]).click()
                
                page.wait_for_load_state("domcontentloaded")
                page.wait_for_timeout(2000)
                
                if "IdentidadLogin" in page.url:
                    raise Exception("Fallo en login. Verifique sus credenciales.")

                # ==========================================
                # FASE 2: NAVEGACIÓN A CONSULTA
                # ==========================================
                logging.info("Login exitoso. Fase 2: Navegando al módulo de consulta...")
                page.goto(self.search_url, wait_until="domcontentloaded")

                # ==========================================
                # FASE 3: EJECUCIÓN DE BÚSQUEDA (MUISCA JSF)
                # ==========================================
                logging.info(f"Fase 3: Ejecutando búsqueda para la cédula global: {self.cedula_consulta}")
                
                input_jsf_cedula = page.locator(self.SELECTORS["search"]["input_target_cedula"])
                input_jsf_cedula.wait_for(state="visible", timeout=15000)
                input_jsf_cedula.fill(self.cedula_consulta)
                
                logging.info("Haciendo clic en el botón de búsqueda JSF...")
                boton_buscar_jsf = page.locator(self.SELECTORS["search"]["btn_search_jsf"])
                boton_buscar_jsf.click()

                # ==========================================
                # FASE 4: INTERPRETACIÓN DE RESULTADOS
                # ==========================================
                logging.info("Fase 4: Esperando y evaluando el contenido de la respuesta...")
                
                selector_exito = page.locator(self.SELECTORS["results"]["span_success"]).first
                patron_no_existe = re.compile(r"no tiene registro de inscripci[oó]n", re.IGNORECASE)
                selector_error = page.locator(self.SELECTORS["results"]["body"]).filter(has_text=patron_no_existe)
                
                max_intentos = 30
                evaluacion_completa = False
                
                for intento in range(max_intentos):
                    if selector_exito.is_visible():
                        texto_interno = selector_exito.inner_text().strip()
                        
                        if re.search(r'\d+', texto_interno):
                            logging.info(f"✅ ¡Etiqueta válida con campo numérico detectada: '{texto_interno}'!")
                            result["status"] = "success"
                            result["rut_exists"] = True
                            result["data"] = {
                                "cedula_consultada": self.cedula_consulta,
                                "contenido_confirmado": texto_interno
                            }
                            result["message"] = "El RUT existe."
                            evaluacion_completa = True
                            break
                    
                    if selector_error.is_visible():
                        logging.info("❌ Modal de error de no inscripción detectado en pantalla.")
                        result["status"] = "success"
                        result["rut_exists"] = False
                        result["message"] = f"Confirmada ausencia de RUT a través del modal de la DIAN."
                        evaluacion_completa = True
                        break
                    
                    page.wait_for_timeout(500)
                
                if not evaluacion_completa and selector_exito.is_visible():
                    texto_final = selector_exito.inner_text().strip()
                    if not re.search(r'\d+', texto_final):
                        logging.warning("⚠️ La etiqueta se renderizó pero permaneció vacía o sin datos numéricos.")
                        result["status"] = "success"
                        result["rut_exists"] = False
                        result["message"] = f"La cédula {self.cedula_consulta} NO tiene RUT."
                        evaluacion_completa = True

                if not evaluacion_completa:
                    raise Exception("Timeout de red: El servidor de la DIAN no arrojó ninguna estructura reconocible.")

            except PlaywrightTimeoutError:
                result["message"] = "Timeout esperando respuesta o interacción con la plataforma de la DIAN."
                logging.error(result["message"])
            except Exception as e:
                result["message"] = str(e)
                logging.error(f"Error en el proceso: {e}")
            finally:
                logging.info("Cerrando navegador...")
                browser.close()
                
            return result

if __name__ == "__main__":
    verifier = DianRutVerifier()
    output = verifier.run()
    
    print("\n--- REPORTE DE EJECUCIÓN ---")
    print(json.dumps(output, indent=4, ensure_ascii=False))
