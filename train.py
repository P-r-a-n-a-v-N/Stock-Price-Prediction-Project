"""ml-service/src/routes/train.py"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import ORJSONResponse
from loguru import logger
from pydantic import BaseModel, Field

from ..services.data_service import DataService
from ..services.train_service import TrainService

router = APIRouter()
_data_svc = DataService()


class TrainRequest(BaseModel):
    ticker: str
    horizon: int = Field(default=7, ge=1, le=30)
    epochs: int = Field(default=50, ge=5, le=200)
    batch_size: int = Field(default=32, ge=8, le=128)


@router.post("/start")
async def start_training(request: Request, body: TrainRequest) -> ORJSONResponse:
    registry = request.app.state.model_registry
    train_svc = TrainService(registry, _data_svc)

    job_id = await train_svc.start_training(
        ticker=body.ticker.upper(),
        horizon=body.horizon,
        epochs=body.epochs,
        batch_size=body.batch_size,
    )
    return ORJSONResponse({"job_id": job_id, "status": "started"})


@router.get("/status/{job_id}")
async def job_status(request: Request, job_id: str) -> ORJSONResponse:
    registry = request.app.state.model_registry
    train_svc = TrainService(registry, _data_svc)
    job = train_svc.get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return ORJSONResponse(job)


@router.get("/models")
async def list_models(request: Request) -> ORJSONResponse:
    registry = request.app.state.model_registry
    return ORJSONResponse({"models": registry.list_models()})
