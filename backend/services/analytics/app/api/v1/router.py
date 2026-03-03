from fastapi import APIRouter
from app.api.v1.endpoints import metrics, exports

api_router = APIRouter()

api_router.include_router(
    metrics.router,
    prefix="/metrics",
    tags=["Metrics"],
)
api_router.include_router(
    exports.router,
    prefix="/exports",
    tags=["Exports"],
)
