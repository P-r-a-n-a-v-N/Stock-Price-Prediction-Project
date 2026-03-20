"""
ml-service/src/services/data_cache.py
Redis cache wrapper for yfinance data (TTL = 15 min).
"""
from __future__ import annotations

import json
import os
from typing import Any, Optional

import redis.asyncio as aioredis
from loguru import logger


class DataCache:
    TTL = 900  # 15 minutes

    def __init__(self) -> None:
        self._url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self._client: Optional[aioredis.Redis] = None

    async def connect(self) -> None:
        try:
            self._client = aioredis.from_url(
                self._url, encoding="utf-8", decode_responses=True
            )
            await self._client.ping()
            logger.info("[Cache] Redis connected")
        except Exception as exc:
            logger.warning(f"[Cache] Redis unavailable, caching disabled: {exc}")
            self._client = None

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()

    async def get(self, key: str) -> Optional[Any]:
        if not self._client:
            return None
        try:
            raw = await self._client.get(key)
            return json.loads(raw) if raw else None
        except Exception:
            return None

    async def set(self, key: str, value: Any) -> None:
        if not self._client:
            return
        try:
            await self._client.setex(key, self.TTL, json.dumps(value))
        except Exception:
            pass
