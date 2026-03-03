import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ai"


@pytest.mark.asyncio
async def test_root(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "running"


@pytest.mark.asyncio
async def test_generate_insights(client: AsyncClient, mock_openai):
    response = await client.post(
        "/api/v1/insights/generate",
        json={
            "organization_id": "00000000-0000-0000-0000-000000000001",
            "metrics_data": {
                "team_size": 10,
                "active_developers": 8,
                "commits": {"total": 100, "additions": 5000, "deletions": 1200},
                "pull_requests": {
                    "total": 20,
                    "merged": 18,
                    "merge_rate": 90,
                    "avg_cycle_time_hours": 12,
                },
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "insights" in data


@pytest.mark.asyncio
async def test_generate_insights_missing_org(client: AsyncClient, mock_openai):
    response = await client.post(
        "/api/v1/insights/generate",
        json={"metrics_data": {"team_size": 5}},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_query(client: AsyncClient, mock_openai):
    response = await client.post(
        "/api/v1/insights/query",
        json={
            "query": "What is the team velocity this week?",
            "context_data": {"commits": 100, "prs": 20},
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "answer" in data
    assert "query" in data
    assert data["query"] == "What is the team velocity this week?"


@pytest.mark.asyncio
async def test_query_without_context(client: AsyncClient, mock_openai):
    response = await client.post(
        "/api/v1/insights/query",
        json={"query": "How many commits did we have last week?"},
    )
    assert response.status_code == 200
    assert response.json()["success"] is True


@pytest.mark.asyncio
async def test_query_missing_query(client: AsyncClient):
    response = await client.post("/api/v1/insights/query", json={})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_weekly_report(client: AsyncClient, mock_openai):
    response = await client.post(
        "/api/v1/insights/weekly-report",
        json={
            "organization_id": "00000000-0000-0000-0000-000000000001",
            "metrics_data": {
                "team_size": 10,
                "active_developers": 8,
                "commits": {"total": 100},
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "report" in data
    assert "generated_at" in data


@pytest.mark.asyncio
async def test_list_insights_empty(client: AsyncClient):
    response = await client.get(
        "/api/v1/insights/list",
        params={"organization_id": "00000000-0000-0000-0000-000000000001"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "insights" in data
    assert "total" in data
    assert data["total"] == 0
    assert data["insights"] == []


@pytest.mark.asyncio
async def test_list_insights_missing_org(client: AsyncClient):
    response = await client.get("/api/v1/insights/list")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_mark_insight_read_not_found(client: AsyncClient):
    response = await client.patch(
        "/api/v1/insights/00000000-0000-0000-0000-000000000999/read"
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_suggestions(client: AsyncClient, mock_openai):
    response = await client.get(
        "/api/v1/insights/suggestions",
        params={"organization_id": "00000000-0000-0000-0000-000000000001"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "suggestions" in data
    assert isinstance(data["suggestions"], list)
    # Default suggestions returned when no insights exist
    assert len(data["suggestions"]) > 0
