"""
ml-service/src/services/predict_service.py
Makes predictions using a trained model.
Scaler state is re-derived from recent data (stateless per request).
"""
from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any

import numpy as np
import pandas as pd
from loguru import logger
from sklearn.preprocessing import MinMaxScaler

from .data_service import DataService
from .model_registry import ModelRegistry

SEQ_LENGTH = 60


class PredictService:
    def __init__(self, registry: ModelRegistry, data_svc: DataService) -> None:
        self._registry = registry
        self._data_svc = data_svc

    async def predict(
        self,
        ticker: str,
        horizon: int,
    ) -> dict[str, Any]:
        """
        Returns:
            {
              "ticker": str,
              "horizon": int,
              "predictions": [{"date": ..., "price": ...}],
              "history": [{"date": ..., "price": ...}],
              "confidence_bands": [{"date": ..., "upper": ..., "lower": ...}],
              "last_close": float,
              "model_trained": bool,
            }
        """
        df = await self._data_svc.fetch_and_engineer(ticker, period_days=365)

        feature_cols = [c for c in df.columns]
        n_features = len(feature_cols)

        model_exists = self._registry.model_exists(ticker, horizon)
        model = await self._registry.get_model(
            ticker=ticker,
            horizon=horizon,
            n_features=n_features,
            timesteps=SEQ_LENGTH,
        )

        # Scale last SEQ_LENGTH rows
        scaler = MinMaxScaler(feature_range=(-1, 1))
        scaled_all = scaler.fit_transform(df[feature_cols].values.astype(np.float32))

        window = scaled_all[-SEQ_LENGTH:]
        X_input = window[np.newaxis, ...]  # (1, seq_len, features)

        # Predict — run in threadpool
        preds_scaled = await asyncio.to_thread(
            lambda: model.predict(X_input, verbose=0)
        )  # shape (1, horizon)

        # Inverse-transform close price only
        close_idx = feature_cols.index("close")
        dummy = np.zeros((horizon, n_features), dtype=np.float32)
        dummy[:, close_idx] = preds_scaled[0]
        preds_full = scaler.inverse_transform(dummy)
        pred_prices = preds_full[:, close_idx].tolist()

        # Build future dates (skip weekends for realism)
        last_date = df.index[-1]
        future_dates = _next_business_days(last_date, horizon)

        # 90% confidence band (simple ±2% heuristic; replace with MC dropout for production)
        predictions = []
        conf_bands = []
        for i, (dt, price) in enumerate(zip(future_dates, pred_prices)):
            predictions.append({"date": dt.strftime("%Y-%m-%d"), "price": round(price, 4)})
            band = price * 0.02 * (1 + i * 0.15)  # grows with horizon
            conf_bands.append({
                "date": dt.strftime("%Y-%m-%d"),
                "upper": round(price + band, 4),
                "lower": round(price - band, 4),
            })

        # Historical last 90 days
        history = [
            {"date": d.strftime("%Y-%m-%d"), "price": round(float(p), 4)}
            for d, p in zip(df.index[-90:], df["close"].values[-90:])
        ]

        return {
            "ticker": ticker.upper(),
            "horizon": horizon,
            "last_close": round(float(df["close"].iloc[-1]), 4),
            "predictions": predictions,
            "history": history,
            "confidence_bands": conf_bands,
            "model_trained": model_exists,
            "generated_at": datetime.utcnow().isoformat(),
        }


def _next_business_days(start: datetime, n: int) -> list[datetime]:
    dates = []
    current = pd.Timestamp(start)
    while len(dates) < n:
        current += pd.Timedelta(days=1)
        if current.dayofweek < 5:  # Mon–Fri
            dates.append(current)
    return dates
