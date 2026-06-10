from pydantic import BaseModel, Field, constr
from typing import Optional, Literal

class RutRequest(BaseModel):
    cedula: str = Field(
        ..., 
        description="Número de cédula colombiana a consultar",
        pattern=r"^\d{6,10}$",
        json_schema_extra={"example": "16728423"}
    )

class RutData(BaseModel):
    cedula_consultada: str
    contenido_confirmado: str

class RutResponse(BaseModel):
    status: Literal["success", "failed"]
    rut_exists: Optional[bool] = None
    data: Optional[RutData] = None
    message: str
    duration_ms: int
