from fastapi import APIRouter

router = APIRouter()

@router.get("/health", status_code=200)
async def health_check():
    """
    Health check endpoint for Render.com to verify the service is running.
    """
    return {"status": "ok", "message": "Service is healthy"}
