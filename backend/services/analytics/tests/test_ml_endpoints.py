"""
Integration tests for the ML analytics endpoints.
Tests are run against an in-memory SQLite-compatible test DB (no real data),
so results will reflect the empty-data path — we validate structure & error cases.
"""
import pytest
from httpx import AsyncClient

ORG_ID = "00000000-0000-0000-0000-000000000001"
UNKNOWN_ORG = "00000000-0000-0000-0000-000000000999"


# ---------------------------------------------------------------------------
# /ml/velocity-trend
# ---------------------------------------------------------------------------

class TestVelocityTrendEndpoint:

    @pytest.mark.asyncio
    async def test_missing_org_id(self, client: AsyncClient):
        response = await client.get("/api/v1/ml/velocity-trend")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_empty_org_returns_404(self, client: AsyncClient):
        """No data for org → 404 from endpoint."""
        response = await client.get(
            "/api/v1/ml/velocity-trend",
            params={"organization_id": ORG_ID, "metric": "commits", "days": 30},
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_invalid_days_below_minimum(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/ml/velocity-trend",
            params={"organization_id": ORG_ID, "metric": "commits", "days": 3},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_days_above_maximum(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/ml/velocity-trend",
            params={"organization_id": ORG_ID, "days": 400},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_valid_metric_prs(self, client: AsyncClient):
        """prs metric is accepted (may 404 if no data)."""
        response = await client.get(
            "/api/v1/ml/velocity-trend",
            params={"organization_id": ORG_ID, "metric": "prs", "days": 30},
        )
        assert response.status_code in (200, 404)

    @pytest.mark.asyncio
    async def test_valid_metric_additions(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/ml/velocity-trend",
            params={"organization_id": ORG_ID, "metric": "additions", "days": 14},
        )
        assert response.status_code in (200, 404)


# ---------------------------------------------------------------------------
# /ml/anomalies
# ---------------------------------------------------------------------------

class TestAnomaliesEndpoint:

    @pytest.mark.asyncio
    async def test_missing_org_id(self, client: AsyncClient):
        response = await client.get("/api/v1/ml/anomalies")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_empty_org_returns_404(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/ml/anomalies",
            params={"organization_id": ORG_ID},
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_method_zscore(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/ml/anomalies",
            params={"organization_id": ORG_ID, "method": "zscore"},
        )
        assert response.status_code in (200, 404)

    @pytest.mark.asyncio
    async def test_method_iqr(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/ml/anomalies",
            params={"organization_id": ORG_ID, "method": "iqr"},
        )
        assert response.status_code in (200, 404)

    @pytest.mark.asyncio
    async def test_days_below_minimum(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/ml/anomalies",
            params={"organization_id": ORG_ID, "days": 5},
        )
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# /ml/developer-score/{developer_id}
# ---------------------------------------------------------------------------

class TestDeveloperScoreEndpoint:
    DEV_ID = "00000000-0000-0000-0000-000000000002"

    @pytest.mark.asyncio
    async def test_missing_org_id(self, client: AsyncClient):
        response = await client.get(f"/api/v1/ml/developer-score/{self.DEV_ID}")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_unknown_developer_returns_score(self, client: AsyncClient):
        """Even with no data, the score endpoint should return a valid score (0 metrics → baseline score)."""
        response = await client.get(
            f"/api/v1/ml/developer-score/{self.DEV_ID}",
            params={"organization_id": ORG_ID, "days": 30},
        )
        # With no data → metrics all zero, but score is computed (not 404)
        assert response.status_code == 200
        data = response.json()
        assert "score" in data
        assert "grade" in data
        assert "dimensions" in data
        assert "developer_id" in data
        assert 0 <= data["score"] <= 100
        assert data["grade"] in ("A", "B", "C", "D", "F")

    @pytest.mark.asyncio
    async def test_days_param_validation(self, client: AsyncClient):
        """days must be 7–90."""
        response = await client.get(
            f"/api/v1/ml/developer-score/{self.DEV_ID}",
            params={"organization_id": ORG_ID, "days": 3},
        )
        assert response.status_code == 422

        response = await client.get(
            f"/api/v1/ml/developer-score/{self.DEV_ID}",
            params={"organization_id": ORG_ID, "days": 100},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_dimensions_all_bounded(self, client: AsyncClient):
        response = await client.get(
            f"/api/v1/ml/developer-score/{self.DEV_ID}",
            params={"organization_id": ORG_ID},
        )
        assert response.status_code == 200
        dims = response.json()["dimensions"]
        for key in ("throughput", "quality", "collaboration"):
            assert key in dims
            assert 0 <= dims[key] <= 100


# ---------------------------------------------------------------------------
# /ml/team-health
# ---------------------------------------------------------------------------

class TestTeamHealthEndpoint:

    @pytest.mark.asyncio
    async def test_missing_org_id(self, client: AsyncClient):
        response = await client.get("/api/v1/ml/team-health")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_empty_org_returns_health(self, client: AsyncClient):
        """Empty org → returns health score (0-team case, not 404)."""
        response = await client.get(
            "/api/v1/ml/team-health",
            params={"organization_id": ORG_ID},
        )
        assert response.status_code == 200
        data = response.json()
        assert "score" in data
        assert "status" in data
        assert "flags" in data
        assert "dimensions" in data
        assert data["status"] in ("healthy", "fair", "at_risk", "critical")
        assert 0 <= data["score"] <= 100

    @pytest.mark.asyncio
    async def test_response_includes_org_id(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/ml/team-health",
            params={"organization_id": ORG_ID},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["organization_id"] == ORG_ID

    @pytest.mark.asyncio
    async def test_flags_is_list(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/ml/team-health",
            params={"organization_id": ORG_ID},
        )
        assert response.status_code == 200
        assert isinstance(response.json()["flags"], list)

    @pytest.mark.asyncio
    async def test_days_validation(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/ml/team-health",
            params={"organization_id": ORG_ID, "days": 3},
        )
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# /ml/sprint-prediction
# ---------------------------------------------------------------------------

class TestSprintPredictionEndpoint:

    @pytest.mark.asyncio
    async def test_missing_org_id(self, client: AsyncClient):
        response = await client.get("/api/v1/ml/sprint-prediction")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_empty_org_returns_404(self, client: AsyncClient):
        """No commit data at all → 404."""
        response = await client.get(
            "/api/v1/ml/sprint-prediction",
            params={"organization_id": ORG_ID},
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_sprint_length_validation(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/ml/sprint-prediction",
            params={"organization_id": ORG_ID, "sprint_length_days": 1},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_num_sprints_validation(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/ml/sprint-prediction",
            params={"organization_id": ORG_ID, "num_sprints": 25},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_num_sprints_below_minimum(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/ml/sprint-prediction",
            params={"organization_id": ORG_ID, "num_sprints": 1},
        )
        assert response.status_code == 422
