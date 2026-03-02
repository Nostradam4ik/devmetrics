from fastapi import APIRouter
from app.api.v1.endpoints import auth, oauth, users

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(oauth.router, prefix="/oauth", tags=["OAuth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
