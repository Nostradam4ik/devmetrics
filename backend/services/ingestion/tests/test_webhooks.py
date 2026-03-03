"""
Tests for the GitHub webhook endpoint.
"""
import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient

ORG_ID = "00000000-0000-0000-0000-000000000001"
REPO_FULL_NAME = "acme/webhook-repo"

SAMPLE_REPO_PAYLOAD = {
    "github_repo_id": 987654321,
    "name": "webhook-repo",
    "full_name": REPO_FULL_NAME,
    "description": "Webhook test repo",
    "default_branch": "main",
    "is_private": False,
    "language": "TypeScript",
    "github_access_token": "ghp_webhook_test",
}


def _webhook_payload(full_name: str = REPO_FULL_NAME, sender: str = "alice"):
    return {
        "repository": {"full_name": full_name, "id": 987654321},
        "sender": {"login": sender},
        "commits": [{"id": "abc123", "message": "feat: add tests"}],
    }


@pytest.mark.asyncio
async def test_webhook_unknown_repo_ignored(client: AsyncClient):
    """Webhook for a repo we don't track → status ignored."""
    response = await client.post(
        "/api/v1/webhooks/github",
        json=_webhook_payload("unknown/repo"),
        headers={"X-GitHub-Event": "push"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ignored"


@pytest.mark.asyncio
async def test_webhook_push_triggers_sync(client: AsyncClient):
    """Push event for a tracked repo → accepted + sync triggered."""
    # Register the repo first
    await client.post(
        "/api/v1/repositories/",
        params={"organization_id": ORG_ID},
        json=SAMPLE_REPO_PAYLOAD,
    )

    with patch("app.api.v1.endpoints.webhooks.sync_repository") as mock_sync:
        mock_sync.delay = MagicMock(return_value=None)
        response = await client.post(
            "/api/v1/webhooks/github",
            json=_webhook_payload(),
            headers={"X-GitHub-Event": "push"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "accepted"
    assert REPO_FULL_NAME in data["message"]


@pytest.mark.asyncio
async def test_webhook_pull_request_event(client: AsyncClient):
    """pull_request event also triggers sync."""
    await client.post(
        "/api/v1/repositories/",
        params={"organization_id": ORG_ID},
        json=SAMPLE_REPO_PAYLOAD,
    )

    with patch("app.api.v1.endpoints.webhooks.sync_repository") as mock_sync:
        mock_sync.delay = MagicMock(return_value=None)
        response = await client.post(
            "/api/v1/webhooks/github",
            json=_webhook_payload(),
            headers={"X-GitHub-Event": "pull_request"},
        )

    assert response.status_code == 200
    assert response.json()["status"] == "accepted"


@pytest.mark.asyncio
async def test_webhook_unhandled_event_ignored(client: AsyncClient):
    """Star/watch events should be ignored gracefully."""
    response = await client.post(
        "/api/v1/webhooks/github",
        json=_webhook_payload(),
        headers={"X-GitHub-Event": "watch"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ignored"


@pytest.mark.asyncio
async def test_webhook_no_repository_field(client: AsyncClient):
    """Payload without repository field → ignored."""
    response = await client.post(
        "/api/v1/webhooks/github",
        json={"sender": {"login": "bot"}},
        headers={"X-GitHub-Event": "push"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ignored"
