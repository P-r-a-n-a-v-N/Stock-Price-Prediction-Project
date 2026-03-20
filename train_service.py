"""
ml-service/src/services/train_service.py
Walk-forward training with KerasTuner + full evaluation.
Each training job runs in a threadpool so the event loop stays free.
"""
from __future__ import annotations

import asyncio
import time
import uuid
from datetime import datetime
from typing import Any, Callable, Optional

import numpy as np
import pandas as pd
from loguru import logger
from sklearn.preprocessing import MinMaxScaler

from ..model import build_model
from .data_service import DataService
from .model_registry import ModelRegistry


SEQ_LENGTH = 60   # lookback window (days)
VAL_SPLIT  = 0.15
TEST_SPLIT  = 0.10


class TrainService:
    """
    Manages training jobs.
    Job IDs are stored per (ticker, horizon) so we never double-train.
    """

    def __init__(
        self,
        registry: ModelRegistry,
        data_svc: DataService,
    ) -> None:
        self._registry = registry
        self._data_svc  = data_svc
        # Maps job_id → {status, progress, metrics, error}
        self._jobs: dict[str, dict] = {}
        # Maps (ticker, horizon) → running job_id
        self._running: dict[str, str] = {}
        self._lock = asyncio.Lock()

    # ── Public API ──────────────────────────────────────────────────────────────

    async def start_training(
        self,
        ticker: str,
        horizon: int,
        epochs: int = 50,
        batch_size: int = 32,
    ) -> str:
        """
        Starts async training. Returns job_id.
        If a job for (ticker, horizon) is already running, returns existing job_id.
        """
        key = f"{ticker.lower()}_{horizon}"

        async with self._lock:
            if key in self._running:
                existing = self._running[key]
                if self._jobs[existing]["status"] == "running":
                    logger.info(f"[Train] Job already running for {key}: {existing}")
                    return existing

            job_id = str(uuid.uuid4())
            self._jobs[job_id] = {
                "job_id": job_id,
                "ticker": ticker,
                "horizon": horizon,
                "status": "queued",
                "progress": 0,
                "metrics": {},
                "error": None,
                "created_at": datetime.utcnow().isoformat(),
            }
            self._running[key] = job_id

        # Fire-and-forget — does NOT block the endpoint
        asyncio.create_task(
            self._run_training(job_id, ticker, horizon, epochs, batch_size)
        )
        return job_id

    def get_job_status(self, job_id: str) -> Optional[dict]:
        return self._jobs.get(job_id)

    def list_jobs(self) -> list[dict]:
        return list(self._jobs.values())

    # ── Internal training pipeline ──────────────────────────────────────────────

    async def _run_training(
        self,
        job_id: str,
        ticker: str,
        horizon: int,
        epochs: int,
        batch_size: int,
    ) -> None:
        key = f"{ticker.lower()}_{horizon}"
        try:
            self._update(job_id, status="running", progress=5)

            # 1. Fetch + engineer features
            df = await self._data_svc.fetch_and_engineer(ticker, period_days=1095)
            self._update(job_id, progress=15)

            # 2. Build sequences (runs in threadpool)
            result = await asyncio.to_thread(
                self._prepare_data, df, horizon
            )
            X_train, y_train, X_val, y_val, X_test, y_test, scalers = result
            n_features = X_train.shape[2]
            self._update(job_id, progress=25)

            # 3. Build model
            model = build_model(
                timesteps=SEQ_LENGTH,
                n_features=n_features,
                horizon=horizon,
                lstm_units=128,
                lstm_layers=2,
                num_transformer_blocks=2,
                embed_dim=64,
                num_heads=4,
                ff_dim=128,
                dropout_rate=0.15,
            )

            # 4. Train (blocking — runs in threadpool)
            history = await asyncio.to_thread(
                self._fit_model,
                model, X_train, y_train, X_val, y_val,
                epochs, batch_size,
                lambda p: self._update(job_id, progress=25 + int(p * 0.55)),
            )
            self._update(job_id, progress=80)

            # 5. Evaluate
            metrics = await asyncio.to_thread(
                self._evaluate, model, X_test, y_test, scalers, horizon
            )
            self._update(job_id, progress=90)

            # 6. Save model
            await self._registry.save_model(ticker, horizon, model)
            self._update(job_id, progress=100, status="completed", metrics=metrics)

        except Exception as exc:
            logger.error(f"[Train] Job {job_id} failed: {exc}", exc_info=True)
            self._update(job_id, status="failed", error=str(exc))
        finally:
            async with self._lock:
                self._running.pop(key, None)

    def _prepare_data(
        self, df: pd.DataFrame, horizon: int
    ) -> tuple:
        """
        Creates scaled sliding-window sequences.
        Returns X_train, y_train, X_val, y_val, X_test, y_test, scalers.
        """
        feature_cols = [c for c in df.columns if c != "close"]
        feature_cols = ["close"] + [c for c in feature_cols]  # close first

        data = df[feature_cols].values.astype(np.float32)
        n = len(data)

        # Split indices
        n_test  = int(n * TEST_SPLIT)
        n_val   = int(n * VAL_SPLIT)
        n_train = n - n_val - n_test

        train_raw = data[:n_train]
        val_raw   = data[n_train:n_train + n_val]
        test_raw  = data[n_train + n_val:]

        # Fit scaler ONLY on train — no data leakage
        scaler = MinMaxScaler(feature_range=(-1, 1))
        train_scaled = scaler.fit_transform(train_raw)
        val_scaled   = scaler.transform(val_raw)
        test_scaled  = scaler.transform(test_raw)

        # Target scaler for inverse transform (close only)
        target_scaler = MinMaxScaler(feature_range=(-1, 1))
        target_scaler.fit(train_raw[:, :1])

        X_train, y_train = self._make_sequences(train_scaled, SEQ_LENGTH, horizon)
        X_val,   y_val   = self._make_sequences(val_scaled,   SEQ_LENGTH, horizon)
        X_test,  y_test  = self._make_sequences(test_scaled,  SEQ_LENGTH, horizon)

        return X_train, y_train, X_val, y_val, X_test, y_test, {
            "feature": scaler,
            "target": target_scaler,
            "feature_cols": feature_cols,
        }

    @staticmethod
    def _make_sequences(
        data: np.ndarray, seq_len: int, horizon: int
    ) -> tuple[np.ndarray, np.ndarray]:
        X, y = [], []
        for i in range(seq_len, len(data) - horizon + 1):
            X.append(data[i - seq_len:i])
            y.append(data[i:i + horizon, 0])  # close price (col 0)
        return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)

    @staticmethod
    def _fit_model(
        model,
        X_train, y_train,
        X_val, y_val,
        epochs: int,
        batch_size: int,
        progress_cb: Callable[[float], None],
    ):
        """Fit model with callbacks. Runs in a thread."""
        import tensorflow as tf

        class ProgressCallback(tf.keras.callbacks.Callback):
            def __init__(self, total_epochs, cb):
                super().__init__()
                self._total = total_epochs
                self._cb = cb

            def on_epoch_end(self, epoch, logs=None):
                self._cb((epoch + 1) / self._total)

        callbacks = [
            tf.keras.callbacks.EarlyStopping(
                monitor="val_loss", patience=10,
                restore_best_weights=True, verbose=0,
            ),
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor="val_loss", factor=0.5, patience=5,
                min_lr=1e-6, verbose=0,
            ),
            ProgressCallback(epochs, progress_cb),
        ]

        history = model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=0,
            shuffle=False,   # time-series: no shuffling
        )
        return history.history

    @staticmethod
    def _evaluate(
        model, X_test, y_test,
        scalers: dict, horizon: int,
    ) -> dict:
        """Compute MAE, RMSE, MAPE, directional accuracy."""
        preds_scaled = model.predict(X_test, verbose=0)
        target_scaler = scalers["target"]

        # Inverse transform — pad to match scaler's feature count (1)
        preds = target_scaler.inverse_transform(preds_scaled)
        actuals = target_scaler.inverse_transform(y_test)

        mae  = float(np.mean(np.abs(preds - actuals)))
        rmse = float(np.sqrt(np.mean((preds - actuals) ** 2)))
        mape = float(np.mean(np.abs((actuals - preds) / (actuals + 1e-8))) * 100)

        # Directional accuracy (1-step)
        pred_dir  = np.sign(preds[:, 0] - X_test[:, -1, 0])
        actual_dir = np.sign(actuals[:, 0] - X_test[:, -1, 0])
        dir_acc = float(np.mean(pred_dir == actual_dir) * 100)

        return {
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "mape": round(mape, 4),
            "directional_accuracy": round(dir_acc, 2),
            "test_samples": int(len(X_test)),
        }

    def _update(self, job_id: str, **kwargs: Any) -> None:
        if job_id in self._jobs:
            self._jobs[job_id].update(kwargs)
