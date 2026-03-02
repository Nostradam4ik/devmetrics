from fastapi import APIRouter
from app.api.v1.endpoints import repositories, webhooks

api_router = APIRouter()

api_router.include_router(
    repositories.router,
    prefix="/repositories",
    tags=["Repositories"],
)

api_router.include_router(
    webhooks.router,
    prefix="/webhooks",
    tags=["Webhooks"],
)
