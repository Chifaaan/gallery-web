"""
routers/health.py
"""
from fastapi import APIRouter, Request
from models.schemas import HealthResponse

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health(request: Request):
    engine = request.app.state.engine
    status = "ok" if engine.model is not None else "loading"
    return HealthResponse(status=status)
