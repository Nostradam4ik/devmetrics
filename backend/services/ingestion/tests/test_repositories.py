"""
Integration tests for the ingestion service — repository endpoints.
"""
import pytest
from httpx import AsyncClient

ORG_ID = "00000000-0000-0000-0000-000000000001"


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ingestion"


@pytest.mark.asyncio
async def test_root(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "running"


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_repositories_empty(client: AsyncClient):
    """Empty org returns empty list."""
    response = await client.get(
        "/api/v1/repositories/",
        params={"organization_id": ORG_ID},
    )
    assert response.status_code == 200
    data = response.json()
    assert "repositories" in data
    assert data["repositories"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_repositories_requires_org(client: AsyncClient):
    """Missing organization_id → 422."""
    response = await client.get("/api/v1/repositories/")
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_add_repository(client: AsyncClient, sample_repo_payload):
    response = await client.post(
        "/api/v1/repositories/",
        params={"organization_id": ORG_ID},
        json=sample_repo_payload,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["full_name"] == "acme/my-service"
    assert data["name"] == "my-service"
    assert data["is_active"] is True
    assert "id" in data


@pytest.mark.asyncio
async def test_add_repository_duplicate(client: AsyncClient, sample_repo_payload):
    """Adding the same github_repo_id twice → 409."""
    await client.post(
        "/api/v1/repositories/",
        params={"organization_id": ORG_ID},
        json=sample_repo_payload,
    )
    response = await client.post(
        "/api/v1/repositories/",
        params={"organization_id": ORG_ID},
        json=sample_repo_payload,
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_add_repository_missing_fields(client: AsyncClient):
    """Payload without required github_repo_id → 422."""
    response = await client.post(
        "/api/v1/repositories/",
        params={"organization_id": ORG_ID},
        json={"name": "incomplete"},
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Get single
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_repository(client: AsyncClient, sample_repo_payload):
    # Create first
    create_resp = await client.post(
        "/api/v1/repositories/",
        params={"organization_id": ORG_ID},
        json=sample_repo_payload,
    )
    repo_id = create_resp.json()["id"]

    response = await client.get(f"/api/v1/repositories/{repo_id}")
    assert response.status_code == 200
    assert response.json()["id"] == repo_id


@pytest.mark.asyncio
async def test_get_repository_not_found(client: AsyncClient):
    response = await client.get(
        "/api/v1/repositories/00000000-0000-0000-0000-000000000999"
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_repository(client: AsyncClient, sample_repo_payload):
    create_resp = await client.post(
        "/api/v1/repositories/",
        params={"organization_id": ORG_ID},
        json=sample_repo_payload,
    )
    repo_id = create_resp.json()["id"]

    response = await client.patch(
        f"/api/v1/repositories/{repo_id}",
        json={"description": "Updated description", "is_active": False},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "Updated description"
    assert data["is_active"] is False


@pytest.mark.asyncio
async def test_update_repository_not_found(client: AsyncClient):
    response = await client.patch(
        "/api/v1/repositories/00000000-0000-0000-0000-000000000999",
        json={"description": "Does not matter"},
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_repository(client: AsyncClient, sample_repo_payload):
    create_resp = await client.post(
        "/api/v1/repositories/",
        params={"organization_id": ORG_ID},
        json=sample_repo_payload,
    )
    repo_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/api/v1/repositories/{repo_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "deleted"

    # Verify gone
    get_resp = await client.get(f"/api/v1/repositories/{repo_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_repository_not_found(client: AsyncClient):
    response = await client.delete(
        "/api/v1/repositories/00000000-0000-0000-0000-000000000999"
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# List after adds
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_repositories_after_add(client: AsyncClient, sample_repo_payload):
    await client.post(
        "/api/v1/repositories/",
        params={"organization_id": ORG_ID},
        json=sample_repo_payload,
    )

    response = await client.get(
        "/api/v1/repositories/",
        params={"organization_id": ORG_ID},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["repositories"]) == 1
    assert data["repositories"][0]["full_name"] == "acme/my-service"


@pytest.mark.asyncio
async def test_sync_trigger_not_found(client: AsyncClient):
    """Sync trigger for unknown repo → 404."""
    response = await client.post(
        "/api/v1/repositories/00000000-0000-0000-0000-000000000999/sync"
    )
    assert response.status_code == 404
