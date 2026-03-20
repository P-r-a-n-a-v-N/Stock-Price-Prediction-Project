"""ml-service/src/routes/data.py"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import ORJSONResponse
from loguru import logger

from ..services.data_service import DataService

router = APIRouter()
_data_svc = DataService()


@router.get("/{ticker}")
async def get_stock_data(
    ticker: str,
    period_days: int = 365,
    include_macro: bool = True,
) -> ORJSONResponse:
    try:
        df = await _data_svc.fetch_and_engineer(
            ticker.upper(), period_days=period_days, include_macro=include_macro
        )
        records = df.reset_index().rename(columns={"index": "date", "Date": "date"})
        records["date"] = records["date"].astype(str)
        data = records[["date", "close", "open", "high", "low", "volume"]].to_dict("records")
        return ORJSONResponse({"ticker": ticker.upper(), "data": data, "count": len(data)})
    except Exception as exc:
        logger.error(f"Data fetch error for {ticker}: {exc}")
        raise HTTPException(status_code=422, detail=str(exc))
