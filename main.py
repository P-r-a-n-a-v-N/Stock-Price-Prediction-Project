"""
ml-service/src/main.py
FastAPI application entry point for StockPredictor ML microservice.
All endpoints are async-safe with proper locking and job deduplication.
"""
from __future__ import annotations

import asyncio
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from loguru import logger

from .routes import predict_router, train_router, data_router, health_router
from .services.model_registry import ModelRegistry
from .services.data_cache import DataCache


# ── Lifespan: startup / shutdown ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialise shared resources on startup; clean up on shutdown."""
    logger.info("Starting ML microservice...")

    # Initialise singletons
    app.state.model_registry = ModelRegistry()
    app.state.data_cache = DataCache()

    await app.state.data_cache.connect()
    logger.info("ML microservice ready.")

    yield

    logger.info("Shutting down ML microservice...")
    await app.state.data_cache.close()
    logger.info("Shutdown complete.")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="StockPredictor ML Service",
    version="1.0.0",
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health_router, prefix="/health", tags=["Health"])
app.include_router(data_router, prefix="/data", tags=["Data"])
app.include_router(predict_router, prefix="/predict", tags=["Predict"])
app.include_router(train_router, prefix="/train", tags=["Train"])
