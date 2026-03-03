"""
Integration model — stores connected third-party services per organization.
Supports: slack, jira (extensible to github_actions, linear, etc.)
"""
from sqlalchemy import Column, String, DateTime, Boolean, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.core.database import Base


class Integration(Base):
    __tablename__ = "integrations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Integration type: 'slack' | 'jira'
    provider = Column(String(50), nullable=False, index=True)
    # Human-readable name (workspace name, Jira site name…)
    name = Column(String(255), nullable=True)

    # OAuth tokens (encrypted at rest in production via a KMS — stored plain here for dev)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)

    # Provider-specific identifiers
    external_id = Column(String(255), nullable=True)   # Slack team_id / Jira site_id
    external_url = Column(String(512), nullable=True)  # Jira site URL / Slack workspace URL

    # Slack-specific
    webhook_url = Column(Text, nullable=True)           # Incoming webhook URL
    channel_id = Column(String(100), nullable=True)     # Default notification channel
    channel_name = Column(String(100), nullable=True)

    # Notification settings (JSON: { sync_complete: true, new_insight: true, … })
    notification_config = Column(JSON, nullable=False, default=lambda: {
        "sync_complete": True,
        "sync_failed": True,
        "new_insight": True,
        "weekly_report": True,
        "pr_merged": False,
        "daily_digest": False,
    })

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    def __repr__(self):
        return f"<Integration {self.provider} org={self.organization_id}>"
