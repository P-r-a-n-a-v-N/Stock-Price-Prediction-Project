"""
ml-service/src/services/model_registry.py

Thread-safe model registry.
Uses asyncio.Lock per (ticker, horizon) key so two concurrent training
requests can never corrupt the same model file.
"""
from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import Optional

import numpy as np
import tensorflow as tf
from filelock import FileLock
from loguru import logger

from ..model import build_model, PositionalEncoding, TransformerBlock


class ModelRegistry:
    """
    Manages model lifecycle: build, save, load, list.

    Key design decisions to eliminate race conditions:
    - One asyncio.Lock per model key (ticker_horizon).
    - FileLock on the .keras file path for cross-process safety.
    - In-memory LRU cache keyed by (ticker, horizon).
    """

    CACHE_SIZE = 10  # max models in memory

    def __init__(self) -> None:
        self._base_dir = Path(os.getenv("MODEL_CACHE_DIR", "/app/models"))
        self._base_dir.mkdir(parents=True, exist_ok=True)

        # Per-key async locks — created lazily
        self._key_locks: dict[str, asyncio.Lock] = {}
        self._global_lock = asyncio.Lock()   # guards _key_locks dict

        # Simple in-memory LRU
        self._cache: dict[str, tf.keras.Model] = {}
        self._cache_order: list[str] = []

    # ── Public API ──────────────────────────────────────────────────────────────

    async def get_model(
        self,
        ticker: str,
        horizon: int,
        n_features: int,
        timesteps: int,
    ) -> tf.keras.Model:
        """Load from disk cache or build a fresh model. Thread-safe."""
        key = self._key(ticker, horizon)
        lock = await self._get_lock(key)

        async with lock:
            if key in self._cache:
                return self._cache[key]

            model_path = self._model_path(ticker, horizon)
            if model_path.exists():
                model = await asyncio.to_thread(self._load, model_path)
            else:
                logger.info(f"[Registry] No saved model for {key}; building fresh.")
                model = build_model(
                    timesteps=timesteps,
                    n_features=n_features,
                    horizon=horizon,
                )

            self._put_cache(key, model)
            return model

    async def save_model(
        self, ticker: str, horizon: int, model: tf.keras.Model
    ) -> None:
        """Atomically save model to disk. Thread-safe via FileLock."""
        key = self._key(ticker, horizon)
        lock = await self._get_lock(key)

        async with lock:
            model_path = self._model_path(ticker, horizon)
            await asyncio.to_thread(self._save, model, model_path)
            self._put_cache(key, model)
            logger.info(f"[Registry] Saved model: {model_path}")

    def model_exists(self, ticker: str, horizon: int) -> bool:
        return self._model_path(ticker, horizon).exists()

    def list_models(self) -> list[dict]:
        models = []
        for path in self._base_dir.glob("*.keras"):
            parts = path.stem.split("_h")
            if len(parts) == 2:
                models.append({
                    "ticker": parts[0].upper(),
                    "horizon": int(parts[1]),
                    "path": str(path),
                    "size_mb": round(path.stat().st_size / 1e6, 2),
                })
        return models

    # ── Private ─────────────────────────────────────────────────────────────────

    async def _get_lock(self, key: str) -> asyncio.Lock:
        async with self._global_lock:
            if key not in self._key_locks:
                self._key_locks[key] = asyncio.Lock()
            return self._key_locks[key]

    def _model_path(self, ticker: str, horizon: int) -> Path:
        return self._base_dir / f"{ticker.lower()}_h{horizon}.keras"

    @staticmethod
    def _key(ticker: str, horizon: int) -> str:
        return f"{ticker.lower()}_{horizon}"

    def _save(self, model: tf.keras.Model, path: Path) -> None:
        lock_path = str(path) + ".lock"
        with FileLock(lock_path, timeout=30):
            model.save(str(path))

    def _load(self, path: Path) -> tf.keras.Model:
        lock_path = str(path) + ".lock"
        with FileLock(lock_path, timeout=30):
            return tf.keras.models.load_model(
                str(path),
                custom_objects={
                    "PositionalEncoding": PositionalEncoding,
                    "TransformerBlock": TransformerBlock,
                },
            )

    def _put_cache(self, key: str, model: tf.keras.Model) -> None:
        if key in self._cache:
            self._cache_order.remove(key)
        elif len(self._cache) >= self.CACHE_SIZE:
            evict = self._cache_order.pop(0)
            del self._cache[evict]
        self._cache[key] = model
        self._cache_order.append(key)
