from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, PasswordChange
from app.services.user_service import UserService

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updated_user = await UserService.update_user(db, current_user, user_update)
    return UserResponse.model_validate(updated_user)


@router.post("/me/change-password")
async def change_my_password(
    password_change: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await UserService.change_password(db, current_user, password_change)
    return {"message": "Password changed successfully"}


@router.delete("/me")
async def delete_my_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await UserService.delete_user(db, current_user)
    return {"message": "Account deleted successfully"}
