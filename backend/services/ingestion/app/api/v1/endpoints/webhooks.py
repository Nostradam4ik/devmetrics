from fastapi import APIRouter, Request, HTTPException
from app.schemas.webhook import WebhookResponse
from app.workers.github_sync import sync_repository
from app.core.database import AsyncSessionLocal
from app.models.repository import Repository
from sqlalchemy import select
import hmac
import hashlib

router = APIRouter()


@router.post("/github", response_model=WebhookResponse)
async def github_webhook(request: Request):
    """
    Handle GitHub webhook events.

    Processes push and pull_request events to trigger
    incremental syncs for affected repositories.
    """
    payload = await request.json()
    event_type = request.headers.get("X-GitHub-Event", "")

    repo_data = payload.get("repository", {})
    repo_full_name = repo_data.get("full_name", "")

    if not repo_full_name:
        return WebhookResponse(status="ignored", message="No repository in payload")

    # Find repository in our system
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Repository).where(
                Repository.full_name == repo_full_name,
                Repository.is_active == True,  # noqa: E712
            )
        )
        repo = result.scalar_one_or_none()

    if not repo:
        return WebhookResponse(
            status="ignored",
            message=f"Repository {repo_full_name} not tracked",
        )

    # Handle different event types
    if event_type in ("push", "pull_request", "pull_request_review"):
        sync_repository.delay(str(repo.id))
        return WebhookResponse(
            status="accepted",
            message=f"Sync triggered for {repo_full_name} ({event_type})",
        )

    return WebhookResponse(
        status="ignored",
        message=f"Event type '{event_type}' not handled",
    )
