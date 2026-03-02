from typing import Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin
from app.schemas.token import Token
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_token_type,
)
from fastapi import HTTPException, status


class AuthService:
    @staticmethod
    async def register_user(
        db: AsyncSession, user_data: UserCreate
    ) -> Tuple[User, Token]:
        result = await db.execute(
            select(User).where(User.email == user_data.email)
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            hashed_password=hashed_password,
            is_active=True,
            is_email_verified=False,
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        tokens = AuthService._generate_tokens(new_user)
        return new_user, tokens

    @staticmethod
    async def login_user(
        db: AsyncSession, credentials: UserLogin
    ) -> Tuple[User, Token]:
        result = await db.execute(
            select(User).where(User.email == credentials.email)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )

        if not user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please use OAuth login",
            )

        if not verify_password(credentials.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled",
            )

        user.last_login_at = datetime.utcnow()
        await db.commit()
        await db.refresh(user)

        tokens = AuthService._generate_tokens(user)
        return user, tokens

    @staticmethod
    async def refresh_access_token(
        db: AsyncSession, refresh_token: str
    ) -> Token:
        payload = decode_token(refresh_token)

        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        if not verify_token_type(payload, "refresh"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )

        user_id = payload.get("sub")
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        return AuthService._generate_tokens(user)

    @staticmethod
    def _generate_tokens(user: User) -> Token:
        token_data = {"sub": str(user.id), "email": user.email}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
        )
