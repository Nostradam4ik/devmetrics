from fastapi import APIRouter
from app.api.v1.endpoints import auth, oauth, users, websocket, integrations

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(oauth.router, prefix="/oauth", tags=["OAuth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(websocket.router, tags=["WebSocket"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["Integrations"])
