from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.routes import health, verify

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API for verifying Colombian RUT status via DIAN MUISCA portal",
)

# Set all CORS enabled origins
if settings.FRONTEND_URL:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_URL],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(health.router, prefix=settings.API_V1_STR, tags=["health"])
app.include_router(verify.router, prefix=settings.API_V1_STR, tags=["verify"])
