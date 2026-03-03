import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "analytics"


@pytest.mark.asyncio
async def test_root(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"


@pytest.mark.asyncio
async def test_team_metrics_empty(client: AsyncClient):
    """Team metrics with no data returns zeros."""
    response = await client.get(
        "/api/v1/metrics/team",
        params={"organization_id": "00000000-0000-0000-0000-000000000001"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "team_size" in data
    assert "commits" in data
    assert "pull_requests" in data
    assert data["team_size"] == 0
    assert data["commits"]["total"] == 0


@pytest.mark.asyncio
async def test_team_metrics_missing_org(client: AsyncClient):
    """Team metrics requires organization_id."""
    response = await client.get("/api/v1/metrics/team")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_timeseries_commits(client: AsyncClient):
    """Time series returns correct structure."""
    response = await client.get(
        "/api/v1/metrics/timeseries",
        params={
            "organization_id": "00000000-0000-0000-0000-000000000001",
            "metric_type": "commits",
            "granularity": "day",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert "metric_type" in data
    assert data["metric_type"] == "commits"
    assert isinstance(data["data"], list)


@pytest.mark.asyncio
async def test_timeseries_invalid_metric(client: AsyncClient):
    """Time series with invalid metric type returns 400."""
    response = await client.get(
        "/api/v1/metrics/timeseries",
        params={
            "organization_id": "00000000-0000-0000-0000-000000000001",
            "metric_type": "invalid_metric_xyz",
        },
    )
    assert response.status_code in (400, 422)


@pytest.mark.asyncio
async def test_summary_metrics(client: AsyncClient):
    """Summary metrics returns all expected fields."""
    response = await client.get(
        "/api/v1/metrics/summary",
        params={"organization_id": "00000000-0000-0000-0000-000000000001"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "total_commits" in data
    assert "pull_requests" in data
    assert "active_developers" in data
    assert "avg_cycle_time" in data
    # Each field has value and change
    for field in ["total_commits", "pull_requests", "active_developers", "avg_cycle_time"]:
        assert "value" in data[field]
        assert "change" in data[field]


@pytest.mark.asyncio
async def test_developer_metrics_not_found(client: AsyncClient):
    """Developer metrics for non-existent developer returns 404."""
    response = await client.get(
        "/api/v1/metrics/developer/00000000-0000-0000-0000-000000000999",
        params={"organization_id": "00000000-0000-0000-0000-000000000001"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_metrics_date_range(client: AsyncClient):
    """Metrics accept start_date and end_date params."""
    response = await client.get(
        "/api/v1/metrics/team",
        params={
            "organization_id": "00000000-0000-0000-0000-000000000001",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
        },
    )
    assert response.status_code == 200
