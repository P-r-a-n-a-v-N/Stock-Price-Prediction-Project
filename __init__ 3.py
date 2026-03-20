from .health import router as health_router
from .data import router as data_router
from .predict import router as predict_router
from .train import router as train_router

__all__ = ["health_router", "data_router", "predict_router", "train_router"]
