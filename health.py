"""ml-service/src/routes/health.py"""
from fastapi import APIRouter
from fastapi.responses import ORJSONResponse

router = APIRouter()

@router.get("")
async def health():
    return ORJSONResponse({"status": "ok", "service": "ml-service"})
