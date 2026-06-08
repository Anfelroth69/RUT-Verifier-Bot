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
        
        # 🛡️ Escudo protector para Windows: Validar que las variables no estén vacías
        if not self.document or not self.password or not self.cedula_consulta:
            logging.error("❌ ERROR CRÍTICO: No se pudieron cargar las variables desde el archivo .env")
            logging.error(f"-> DIAN_DOCUMENT: {'Cargado ✅' if self.document else 'VACÍO ❌'}")
            logging.error(f"-> DIAN_PASSWORD: {'Cargado ✅' if self.password else 'VACÍO ❌'}")
            logging.error(f"-> CEDULA_CONSULTA: {'Cargado ✅' if self.cedula_consulta else 'VACÍO ❌'}")
            raise ValueError("Revisa la codificación UTF-8 o la ubicación de tu archivo .env")
        
        self.login_url = "https://muisca.dian.gov.co/WebIdentidadLogin"
        self.search_url = "https://muisca.dian.gov.co/WebArquitectura/DefConsultaPersonas.faces"

    def run(self):
        result = {"status": "failed", "rut_exists": None, "data": None, "message": ""}
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True) 
            
            # 🛡️ OPTIMIZACIÓN CRÍTICA PARA WINDOWS: Forzar localización y headers en español
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                permissions=[],
                locale="es-CO",  # Forzamos idioma Español (Colombia) en el navegador
                extra_http_headers={
                    "Accept-Language": "es-CO,es;q=0.9"  # Evita que el servidor reescriba la URL a 'WebArchitecture'
                }
            )
            page = context.new_page()

            try:
                # ==========================================
                # FASE 1: AUTENTICACIÓN
                # ==========================================
                logging.info("Iniciacion Fase 1: Autenticación...")
                page.goto(self.login_url, wait_until="networkidle")
                
                # 🛡️ MANEJADOR DE MODALES EN CASCADA
                page.wait_for_timeout(1500) 
                
                # 1. Limpiar modal de "Notificaciones" si aparece
                texto_notificaciones = "navegador le preguntara si desea permitir las notificaciones"
                if page.locator(f"text={texto_notificaciones}").is_visible() or page.locator("text='Notificaciones'").is_visible():
                    logging.warning("⚠️ Se detectó el modal superior de 'Notificaciones'. Despejando...")
                    boton_continuar = page.locator("text='Continuar'").first
                    if boton_continuar.is_visible():
                        boton_continuar.click()
                    else:
                        page.keyboard.press("Escape")
                    page.wait_for_timeout(600) 

                # 2. Limpiar modal de "Ingreso Incorrecto"
                texto_ingreso = "intentando ingresar de manera incorrecta"
                if page.locator(f"text={texto_ingreso}").is_visible():
                    logging.warning("⚠️ Se detectó el modal de 'Ingreso Incorrecto'. Cerrándolo...")
                    page.keyboard.press("Escape")
                    page.wait_for_timeout(500)
                    
                    if page.locator(f"text={texto_ingreso}").is_visible():
                        logging.info("Forzando clic en el botón 'X' del modal...")
                        boton_x = page.locator("button:has(mat-icon:has-text('close')), mat-icon:has-text('close')").first
                        if boton_x.is_visible():
                            boton_x.click(force=True)
                    
                    page.locator(f"text={texto_ingreso}").wait_for(state="hidden", timeout=5000)
                    logging.info("✅ Todos los modales han sido removidos exitosamente.")
                else:
                    logging.info("Formulario despejado, no se visualizaron advertencias.")

                # --- Llenado del Formulario ---
                logging.info("Desplegando el selector de tipo de documento...")
                selector_doc = page.locator("mat-select[name='tipoDocumento'] .mat-select-trigger")
                selector_doc.wait_for(state="visible", timeout=15000)
                selector_doc.click()
                page.wait_for_timeout(500)

                logging.info("Seleccionando la opción EXACTA 'Cédula de ciudadanía'...")
                regex_cedula_exacta = re.compile(r"^C[ée]dula de ciudadan[íi]a$", re.IGNORECASE)
                page.locator("mat-option").filter(has_text=regex_cedula_exacta).first.click()

                logging.info("Ingresando Número de Documento...")
                page.locator("input[name='numDocumento']").fill(self.document)

                logging.info("Ingresando Contraseña...")
                page.locator("input[type='password']").fill(self.password)
                
                logging.info("Aceptando Tratamiento de Datos...")
                page.locator("mat-checkbox:has(input[name='aceptaTratamientoDatos'])").click()
                
                logging.info("Esperando validación del formulario y haciendo clic en Ingresar...")
                page.locator("button.mat-raised-button:has-text('Ingresar')").click()
                
                # Validación de navegación post-login
                page.wait_for_load_state("networkidle")
                if "IdentidadLogin" in page.url:
                    raise Exception("Fallo en login. Verifique sus credenciales.")

                # ==========================================
                # FASE 2: NAVEGACIÓN A CONSULTA
                # ==========================================
                logging.info("Login exitoso. Fase 2: Navegando al módulo de consulta...")
                
                # Ahora que el header viaja estrictamente en español, JSF resolverá correctamente el recurso
                page.goto(self.search_url, wait_until="networkidle")

                # ==========================================
                # FASE 3: EJECUCIÓN DE BÚSQUEDA (MUISCA JSF)
                # ==========================================
                logging.info(f"Fase 3: Ejecutando búsqueda para la cédula global: {self.cedula_consulta}")
                
                input_jsf_cedula = page.locator('input[id="vistaConsultaPersonas:frmConsultaPersonas:txtNumIdentVigente"]')
                input_jsf_cedula.wait_for(state="visible", timeout=15000)
                input_jsf_cedula.fill(self.cedula_consulta)
                
                logging.info("Haciendo clic en el botón de búsqueda JSF...")
                boton_buscar_jsf = page.locator('input[type="image"][src*="botbuscar.gif"], input[name="vistaConsultaPersonas:frmConsultaPersonas:_id46"]')
                boton_buscar_jsf.click()

                # ==========================================
                # FASE 4: INTERPRETACIÓN DE RESULTADOS
                # ==========================================
                logging.info("Fase 4: Esperando y evaluando el contenido de la respuesta...")
                
                selector_exito = page.locator('span.textoNegro').filter(has_text=re.compile(r'\d+')).first
                patron_no_existe = re.compile(r"no tiene registro de inscripci[oó]n", re.IGNORECASE)
                selector_error = page.locator("body").filter(has_text=patron_no_existe)
                
                max_intentos = 30
                evaluacion_completa = False
                
                for intento in range(max_intentos):
                    if selector_exito.is_visible():
                        texto_interno = selector_exito.inner_text().strip()
                        logging.info(f"✅ ¡Etiqueta válida con campo numérico detectada: '{texto_interno}'!")
                        logging.info("La cédula tiene RUT")
                        result["status"] = "success"
                        result["rut_exists"] = True
                        result["data"] = {
                            "cedula_consultada": self.cedula_consulta,
                            "contenido_confirmado": texto_interno
                        }
                        result["message"] = "la cedula tiene rut"
                        evaluacion_completa = True
                        break
                    
                    if selector_error.is_visible():
                        logging.info("❌ Modal de error de no inscripción detectado en pantalla.")
                        logging.info("La cédula no tiene RUT")
                        result["status"] = "success"
                        result["rut_exists"] = False
                        result["message"] = "la cedula no tiene rut"
                        evaluacion_completa = True
                        break
                    
                    page.wait_for_timeout(500)
                
                if not evaluacion_completa:
                    logging.info("La cédula no tiene RUT")
                    result["status"] = "success"
                    result["rut_exists"] = False
                    result["message"] = "la cedula no tiene rut"

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