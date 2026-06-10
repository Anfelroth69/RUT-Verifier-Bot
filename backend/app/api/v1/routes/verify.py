import asyncio
from fastapi import APIRouter, HTTPException, status
from app.schemas.rut import RutRequest, RutResponse
from app.services.rut_verifier import DianRutVerifier
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Global semaphore to restrict Playwright to exactly 1 concurrent execution.
# This prevents out-of-memory errors on 512MB instances (Render Free Tier).
playwright_semaphore = asyncio.Semaphore(1)

@router.post("/verify", response_model=RutResponse, status_code=status.HTTP_200_OK)
async def verify_rut(request: RutRequest):
    logger.info(f"Recibida petición para verificar RUT de cédula: {request.cedula}")
    
    # Wait for the semaphore before launching Playwright
    async with playwright_semaphore:
        logger.info(f"Semáforo adquirido para cédula: {request.cedula}. Iniciando bot...")
        try:
            verifier = DianRutVerifier()
            result = await verifier.run(cedula_consulta=request.cedula)
            
            if result["status"] == "failed":
                logger.error(f"Fallo reportado por el bot para {request.cedula}: {result['message']}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=result["message"]
                )
                
            return RutResponse(**result)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.exception(f"Error inesperado procesando {request.cedula}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error interno del servidor: {str(e)}"
            )
