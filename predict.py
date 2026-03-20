"""ml-service/src/routes/predict.py"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import ORJSONResponse
from loguru import logger

from ..services.data_service import DataService
from ..services.predict_service import PredictService

router = APIRouter()
_data_svc = DataService()


@router.get("/{ticker}")
async def predict(
    request: Request,
    ticker: str,
    horizon: int = 7,
) -> ORJSONResponse:
    if horizon < 1 or horizon > 30:
        raise HTTPException(status_code=400, detail="horizon must be 1–30")

    registry = request.app.state.model_registry
    predict_svc = PredictService(registry, _data_svc)

    try:
        result = await predict_svc.predict(ticker.upper(), horizon)
        return ORJSONResponse(result)
    except Exception as exc:
        logger.error(f"Prediction error {ticker} h={horizon}: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))
