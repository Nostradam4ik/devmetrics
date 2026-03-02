from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.schemas.user import UserUpdate, PasswordChange
from app.core.security import verify_password, get_password_hash
from fastapi import HTTPException, status
import uuid


class UserService:
    @staticmethod
    async def get_user_by_id(
        db: AsyncSession, user_id: uuid.UUID
    ) -> Optional[User]:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_email(
        db: AsyncSession, email: str
    ) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    @staticmethod
    async def update_user(
        db: AsyncSession, user: User, user_update: UserUpdate
    ) -> User:
        update_data = user_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def change_password(
        db: AsyncSession, user: User, password_change: PasswordChange
    ) -> bool:
        if not user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OAuth users cannot change password",
            )

        if not verify_password(
            password_change.current_password, user.hashed_password
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect",
            )

        user.hashed_password = get_password_hash(password_change.new_password)
        await db.commit()
        return True

    @staticmethod
    async def delete_user(db: AsyncSession, user: User) -> bool:
        user.is_active = False
        await db.commit()
        return True
