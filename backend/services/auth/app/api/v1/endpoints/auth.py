from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.schemas.token import Token, RefreshTokenRequest
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    user, tokens = await AuthService.register_user(db, user_data)
    return {
        "message": "User registered successfully",
        "user": UserResponse.model_validate(user),
        "tokens": tokens,
    }


@router.post("/login", response_model=dict)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    user, tokens = await AuthService.login_user(db, credentials)
    return {
        "message": "Login successful",
        "user": UserResponse.model_validate(user),
        "tokens": tokens,
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)
):
    tokens = await AuthService.refresh_access_token(db, refresh_data.refresh_token)
    return tokens


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    return {
        "message": "Logout successful",
        "detail": "Please remove tokens from client storage",
    }
