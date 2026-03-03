"""
Lightweight Redis event publisher for the ingestion service.
Mirrors the channel naming convention used by the auth service
notification_service so that events reach WebSocket clients.
"""
import json
import logging
from datetime import datetime

import redis

from app.core.config import settings

logger = logging.getLogger(__name__)

CHANNEL_PREFIX = "devmetrics:events:"


def _get_sync_redis():
    """Return a synchronous Redis client (for use inside Celery tasks)."""
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


def _publish(org_id: str, event_type: str, data: dict) -> None:
    """Publish a real-time event for an organization (synchronous)."""
    try:
        r = _get_sync_redis()
        payload = {
            "type": event_type,
            "org_id": org_id,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        }
        r.publish(f"{CHANNEL_PREFIX}{org_id}", json.dumps(payload))
        r.close()
    except Exception as e:
        # Non-critical: real-time notifications are best-effort
        logger.warning(f"Failed to publish event {event_type} for org {org_id}: {e}")


def publish_sync_started(org_id: str, repo_name: str) -> None:
    _publish(org_id, "sync_started", {"repo": repo_name})


def publish_sync_completed(org_id: str, repo_name: str, commits_added: int) -> None:
    _publish(
        org_id,
        "sync_completed",
        {"repo": repo_name, "commits_added": commits_added},
    )


def publish_sync_failed(org_id: str, repo_name: str, error: str) -> None:
    _publish(org_id, "sync_failed", {"repo": repo_name, "error": error})


def publish_metrics_updated(org_id: str) -> None:
    _publish(org_id, "metrics_updated", {})
