from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "RUT Verifier API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # DIAN Credentials
    DIAN_DOCUMENT: str
    DIAN_PASSWORD: str
    
    # Playwright config
    PLAYWRIGHT_HEADLESS: bool = True
    
    # CORS Config
    FRONTEND_URL: str = "http://localhost:4321"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore")

settings = Settings()
