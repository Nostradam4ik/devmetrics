from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.oauth import GitHubAuthURL, GitHubCallback
from app.schemas.user import UserResponse
from app.services.oauth_service import OAuthService

router = APIRouter()


@router.get("/github/authorize", response_model=GitHubAuthURL)
async def github_authorize(state: str = Query(None)):
    auth_url = OAuthService.get_github_auth_url(state)
    return GitHubAuthURL(auth_url=auth_url)


@router.post("/github/callback", response_model=dict)
async def github_callback(
    callback_data: GitHubCallback, db: AsyncSession = Depends(get_db)
):
    user, tokens = await OAuthService.github_callback(db, callback_data.code)
    return {
        "message": "GitHub authentication successful",
        "user": UserResponse.model_validate(user),
        "tokens": tokens,
    }


@router.get("/github/callback")
async def github_callback_get(
    code: str = Query(...),
    state: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    callback_data = GitHubCallback(code=code, state=state)
    user, tokens = await OAuthService.github_callback(db, callback_data.code)
    return {
        "message": "GitHub authentication successful",
        "user": UserResponse.model_validate(user),
        "tokens": tokens,
    }
