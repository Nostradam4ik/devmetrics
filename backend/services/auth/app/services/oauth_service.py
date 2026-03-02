import httpx
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from app.models.user import User
from app.schemas.token import Token
from app.schemas.oauth import GitHubUserInfo
from app.core.config import settings
from app.services.auth_service import AuthService
from fastapi import HTTPException, status


class OAuthService:
    @staticmethod
    def get_github_auth_url(state: Optional[str] = None) -> str:
        params = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": settings.GITHUB_REDIRECT_URI,
            "scope": "read:user user:email repo read:org",
        }

        if state:
            params["state"] = state

        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{settings.GITHUB_AUTH_URL}?{query_string}"

    @staticmethod
    async def github_callback(
        db: AsyncSession, code: str
    ) -> Tuple[User, Token]:
        access_token = await OAuthService._exchange_code_for_token(code)
        github_user = await OAuthService._get_github_user_info(access_token)
        user = await OAuthService._find_or_create_github_user(
            db, github_user, access_token
        )

        user.last_login_at = datetime.utcnow()
        await db.commit()
        await db.refresh(user)

        tokens = AuthService._generate_tokens(user)
        return user, tokens

    @staticmethod
    async def _exchange_code_for_token(code: str) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.GITHUB_TOKEN_URL,
                headers={"Accept": "application/json"},
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": settings.GITHUB_REDIRECT_URI,
                },
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to exchange code for token",
                )

            data = response.json()
            access_token = data.get("access_token")

            if not access_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No access token in response",
                )

            return access_token

    @staticmethod
    async def _get_github_user_info(access_token: str) -> GitHubUserInfo:
        async with httpx.AsyncClient() as client:
            user_response = await client.get(
                f"{settings.GITHUB_API_URL}/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
            )

            if user_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to fetch user info from GitHub",
                )

            user_data = user_response.json()

            email = user_data.get("email")
            if not email:
                emails_response = await client.get(
                    f"{settings.GITHUB_API_URL}/user/emails",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/json",
                    },
                )
                if emails_response.status_code == 200:
                    emails = emails_response.json()
                    primary_email = next(
                        (e for e in emails if e.get("primary")), None
                    )
                    if primary_email:
                        email = primary_email.get("email")

            return GitHubUserInfo(
                login=user_data["login"],
                id=user_data["id"],
                avatar_url=user_data.get("avatar_url", ""),
                name=user_data.get("name"),
                email=email,
                company=user_data.get("company"),
                location=user_data.get("location"),
            )

    @staticmethod
    async def _find_or_create_github_user(
        db: AsyncSession, github_user: GitHubUserInfo, access_token: str
    ) -> User:
        # Try to find by GitHub ID
        result = await db.execute(
            select(User).where(User.github_id == github_user.id)
        )
        user = result.scalar_one_or_none()

        if user:
            user.github_login = github_user.login
            user.github_access_token = access_token
            user.github_token_expires_at = datetime.utcnow() + timedelta(days=365)
            user.avatar_url = github_user.avatar_url
            if github_user.name and not user.full_name:
                user.full_name = github_user.name
            return user

        # Try to find by email
        if github_user.email:
            result = await db.execute(
                select(User).where(User.email == github_user.email)
            )
            user = result.scalar_one_or_none()

            if user:
                user.github_id = github_user.id
                user.github_login = github_user.login
                user.github_access_token = access_token
                user.github_token_expires_at = datetime.utcnow() + timedelta(days=365)
                user.avatar_url = github_user.avatar_url
                return user

        # Create new user
        if not github_user.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="GitHub account has no public email. Please make your email public or register with email/password.",
            )

        new_user = User(
            email=github_user.email,
            full_name=github_user.name,
            avatar_url=github_user.avatar_url,
            github_id=github_user.id,
            github_login=github_user.login,
            github_access_token=access_token,
            github_token_expires_at=datetime.utcnow() + timedelta(days=365),
            is_active=True,
            is_email_verified=True,
            hashed_password=None,
        )

        db.add(new_user)
        return new_user
