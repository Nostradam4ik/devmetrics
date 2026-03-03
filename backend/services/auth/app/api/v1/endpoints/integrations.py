"""
Integrations endpoints — Slack & Jira OAuth flows + management.
"""
import logging
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.models.integration import Integration
from app.services.slack_service import slack_service
from app.services.jira_service import jira_service

router = APIRouter()
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class IntegrationOut(BaseModel):
    id: str
    provider: str
    name: Optional[str]
    is_active: bool
    channel_name: Optional[str]
    external_url: Optional[str]
    notification_config: dict
    created_at: str

    class Config:
        from_attributes = True


class NotificationConfigUpdate(BaseModel):
    sync_complete: Optional[bool] = None
    sync_failed: Optional[bool] = None
    new_insight: Optional[bool] = None
    weekly_report: Optional[bool] = None
    pr_merged: Optional[bool] = None
    daily_digest: Optional[bool] = None


class SlackCallbackPayload(BaseModel):
    code: str
    org_id: str


class JiraCallbackPayload(BaseModel):
    code: str
    org_id: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_integration(
    db: AsyncSession, org_id: str, provider: str
) -> Optional[Integration]:
    result = await db.execute(
        select(Integration).where(
            Integration.organization_id == org_id,
            Integration.provider == provider,
            Integration.is_active == True,  # noqa: E712
        )
    )
    return result.scalar_one_or_none()


def _integration_to_out(integ: Integration) -> dict:
    return {
        "id": str(integ.id),
        "provider": integ.provider,
        "name": integ.name,
        "is_active": integ.is_active,
        "channel_name": integ.channel_name,
        "external_url": integ.external_url,
        "notification_config": integ.notification_config or {},
        "created_at": integ.created_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# List integrations
# ---------------------------------------------------------------------------

@router.get("/")
async def list_integrations(
    organization_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Return all active integrations for an organization."""
    result = await db.execute(
        select(Integration).where(
            Integration.organization_id == organization_id,
            Integration.is_active == True,  # noqa: E712
        )
    )
    integrations = result.scalars().all()
    return {"integrations": [_integration_to_out(i) for i in integrations]}


# ---------------------------------------------------------------------------
# Slack
# ---------------------------------------------------------------------------

@router.get("/slack/oauth-url")
async def slack_oauth_url(
    organization_id: str = Query(...),
):
    """Return the Slack OAuth authorization URL."""
    if not settings.SLACK_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Slack integration not configured (missing SLACK_CLIENT_ID).",
        )
    url = slack_service.get_oauth_url(
        org_id=organization_id,
        redirect_uri=settings.SLACK_REDIRECT_URI,
    )
    return {"url": url}


@router.post("/slack/callback")
async def slack_callback(
    payload: SlackCallbackPayload,
    db: AsyncSession = Depends(get_db),
):
    """Handle Slack OAuth callback — exchange code, store integration."""
    try:
        data = await slack_service.exchange_code(
            code=payload.code,
            redirect_uri=settings.SLACK_REDIRECT_URI,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Upsert integration
    existing = await _get_integration(db, payload.org_id, "slack")
    if existing:
        existing.name = data["team_name"]
        existing.access_token = data["access_token"]
        existing.external_id = data["team_id"]
        existing.webhook_url = data["webhook_url"]
        existing.channel_id = data["channel_id"]
        existing.channel_name = data["channel_name"]
        existing.updated_at = datetime.utcnow()
        integration = existing
    else:
        integration = Integration(
            organization_id=payload.org_id,
            provider="slack",
            name=data["team_name"],
            access_token=data["access_token"],
            external_id=data["team_id"],
            webhook_url=data["webhook_url"],
            channel_id=data["channel_id"],
            channel_name=data["channel_name"],
        )
        db.add(integration)

    await db.commit()
    await db.refresh(integration)
    return {"success": True, "integration": _integration_to_out(integration)}


@router.post("/slack/test")
async def test_slack(
    organization_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Send a test message to the connected Slack channel."""
    integration = await _get_integration(db, organization_id, "slack")
    if not integration or not integration.webhook_url:
        raise HTTPException(status_code=404, detail="Slack integration not found.")

    ok = await slack_service.test_webhook(
        integration.webhook_url,
        integration.channel_name or "general",
    )
    if not ok:
        raise HTTPException(status_code=502, detail="Slack webhook delivery failed.")
    return {"success": True, "message": "Test message sent to Slack."}


@router.patch("/slack/notifications")
async def update_slack_notifications(
    organization_id: str = Query(...),
    config: NotificationConfigUpdate = ...,
    db: AsyncSession = Depends(get_db),
):
    """Update which events trigger Slack notifications."""
    integration = await _get_integration(db, organization_id, "slack")
    if not integration:
        raise HTTPException(status_code=404, detail="Slack integration not found.")

    current = dict(integration.notification_config or {})
    updates = config.model_dump(exclude_none=True)
    current.update(updates)
    integration.notification_config = current
    integration.updated_at = datetime.utcnow()
    await db.commit()

    return {"success": True, "notification_config": current}


# ---------------------------------------------------------------------------
# Jira
# ---------------------------------------------------------------------------

@router.get("/jira/oauth-url")
async def jira_oauth_url(
    organization_id: str = Query(...),
):
    """Return the Jira OAuth 2.0 authorization URL."""
    if not settings.JIRA_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Jira integration not configured (missing JIRA_CLIENT_ID).",
        )
    url = jira_service.get_oauth_url(
        org_id=organization_id,
        redirect_uri=settings.JIRA_REDIRECT_URI,
    )
    return {"url": url}


@router.post("/jira/callback")
async def jira_callback(
    payload: JiraCallbackPayload,
    db: AsyncSession = Depends(get_db),
):
    """Handle Jira OAuth callback — exchange code, fetch sites, store integration."""
    try:
        tokens = await jira_service.exchange_code(
            code=payload.code,
            redirect_uri=settings.JIRA_REDIRECT_URI,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")

    # Get accessible Jira sites
    try:
        resources = await jira_service.get_accessible_resources(access_token)
    except Exception:
        resources = []

    site = resources[0] if resources else {}
    cloud_id = site.get("id", "")
    site_name = site.get("name", "Jira")
    site_url = site.get("url", "")

    existing = await _get_integration(db, payload.org_id, "jira")
    if existing:
        existing.name = site_name
        existing.access_token = access_token
        existing.refresh_token = refresh_token
        existing.external_id = cloud_id
        existing.external_url = site_url
        existing.updated_at = datetime.utcnow()
        integration = existing
    else:
        integration = Integration(
            organization_id=payload.org_id,
            provider="jira",
            name=site_name,
            access_token=access_token,
            refresh_token=refresh_token,
            external_id=cloud_id,
            external_url=site_url,
        )
        db.add(integration)

    await db.commit()
    await db.refresh(integration)
    return {"success": True, "integration": _integration_to_out(integration)}


@router.get("/jira/projects")
async def list_jira_projects(
    organization_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Return Jira projects for a connected organization."""
    integration = await _get_integration(db, organization_id, "jira")
    if not integration:
        raise HTTPException(status_code=404, detail="Jira integration not found.")

    try:
        projects = await jira_service.get_projects(
            access_token=integration.access_token,
            cloud_id=integration.external_id,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API error: {e}")

    return {"projects": projects}


@router.get("/jira/metrics")
async def get_jira_metrics(
    organization_id: str = Query(...),
    project_key: str = Query(...),
    days: int = Query(30),
    db: AsyncSession = Depends(get_db),
):
    """Return aggregated Jira issue metrics for a project."""
    integration = await _get_integration(db, organization_id, "jira")
    if not integration:
        raise HTTPException(status_code=404, detail="Jira integration not found.")

    try:
        metrics = await jira_service.get_issue_metrics(
            access_token=integration.access_token,
            cloud_id=integration.external_id,
            project_key=project_key,
            days=days,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API error: {e}")

    return metrics


@router.get("/jira/sprint")
async def get_jira_sprint(
    organization_id: str = Query(...),
    project_key: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Return current sprint issues for a project."""
    integration = await _get_integration(db, organization_id, "jira")
    if not integration:
        raise HTTPException(status_code=404, detail="Jira integration not found.")

    try:
        sprint = await jira_service.get_sprint_issues(
            access_token=integration.access_token,
            cloud_id=integration.external_id,
            project_key=project_key,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API error: {e}")

    return sprint


# ---------------------------------------------------------------------------
# Disconnect (any provider)
# ---------------------------------------------------------------------------

@router.delete("/{provider}")
async def disconnect_integration(
    provider: str,
    organization_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Disconnect (deactivate) an integration."""
    integration = await _get_integration(db, organization_id, provider)
    if not integration:
        raise HTTPException(
            status_code=404, detail=f"{provider} integration not found."
        )
    integration.is_active = False
    integration.updated_at = datetime.utcnow()
    await db.commit()
    return {"success": True, "message": f"{provider} disconnected."}
