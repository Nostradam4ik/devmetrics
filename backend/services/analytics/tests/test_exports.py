"""
Integration tests for export endpoints (PDF, CSV, email).
PDF generation requires WeasyPrint; we mock the heavy generators in tests.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient

ORG_ID = "00000000-0000-0000-0000-000000000001"


# ---------------------------------------------------------------------------
# CSV exports — no external dependencies
# ---------------------------------------------------------------------------

class TestCsvExports:

    @pytest.mark.asyncio
    async def test_team_csv_requires_org(self, client: AsyncClient):
        response = await client.get("/api/v1/exports/csv/team")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_team_csv_returns_csv(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/exports/csv/team",
            params={"organization_id": ORG_ID},
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        assert "attachment" in response.headers.get("content-disposition", "")

    @pytest.mark.asyncio
    async def test_team_csv_content_has_header(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/exports/csv/team",
            params={"organization_id": ORG_ID},
        )
        assert response.status_code == 200
        content = response.text
        # Should contain CSV headers
        assert "developer" in content.lower() or "github" in content.lower() or "commits" in content.lower()

    @pytest.mark.asyncio
    async def test_timeseries_csv_requires_org(self, client: AsyncClient):
        response = await client.get("/api/v1/exports/csv/timeseries")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_timeseries_csv_commits(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/exports/csv/timeseries",
            params={"organization_id": ORG_ID, "metric_type": "commits"},
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")

    @pytest.mark.asyncio
    async def test_timeseries_csv_prs(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/exports/csv/timeseries",
            params={"organization_id": ORG_ID, "metric_type": "prs"},
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_timeseries_csv_invalid_metric(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/exports/csv/timeseries",
            params={"organization_id": ORG_ID, "metric_type": "invalid_xyz"},
        )
        # Either 400 or empty CSV — not 500
        assert response.status_code in (200, 400, 422)


# ---------------------------------------------------------------------------
# PDF export — mock WeasyPrint
# ---------------------------------------------------------------------------

class TestPdfExport:

    @pytest.mark.asyncio
    async def test_pdf_requires_org(self, client: AsyncClient):
        response = await client.get("/api/v1/exports/pdf/team")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_pdf_returns_pdf_content_type(self, client: AsyncClient):
        """Mock WeasyPrint so tests don't need a full browser environment."""
        fake_pdf = b"%PDF-1.4 fake pdf content"
        with patch(
            "app.services.report_generator.ReportGenerator.generate_team_pdf",
            new_callable=AsyncMock,
            return_value=fake_pdf,
        ):
            response = await client.get(
                "/api/v1/exports/pdf/team",
                params={"organization_id": ORG_ID},
            )
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
        assert "attachment" in response.headers.get("content-disposition", "")

    @pytest.mark.asyncio
    async def test_pdf_content_disposition_filename(self, client: AsyncClient):
        fake_pdf = b"%PDF-1.4 fake"
        with patch(
            "app.services.report_generator.ReportGenerator.generate_team_pdf",
            new_callable=AsyncMock,
            return_value=fake_pdf,
        ):
            response = await client.get(
                "/api/v1/exports/pdf/team",
                params={"organization_id": ORG_ID},
            )
        cd = response.headers.get("content-disposition", "")
        assert ".pdf" in cd


# ---------------------------------------------------------------------------
# Email export — mock SMTP
# ---------------------------------------------------------------------------

class TestEmailExport:

    @pytest.mark.asyncio
    async def test_send_email_requires_payload(self, client: AsyncClient):
        response = await client.post("/api/v1/exports/email/send-now", json={})
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_send_email_missing_recipients(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/exports/email/send-now",
            json={"organization_id": ORG_ID, "recipients": []},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_send_email_success(self, client: AsyncClient):
        """Mock SMTP delivery — verify endpoint returns success."""
        with patch(
            "app.services.email_report_service.EmailReportService.send_team_report",
            new_callable=AsyncMock,
            return_value=True,
        ), patch(
            "app.services.report_generator.ReportGenerator.generate_team_pdf",
            new_callable=AsyncMock,
            return_value=b"%PDF fake",
        ):
            response = await client.post(
                "/api/v1/exports/email/send-now",
                json={
                    "organization_id": ORG_ID,
                    "recipients": ["test@example.com"],
                    "report_title": "Test Report",
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True

    @pytest.mark.asyncio
    async def test_send_email_invalid_address(self, client: AsyncClient):
        """Pydantic EmailStr should reject malformed addresses."""
        response = await client.post(
            "/api/v1/exports/email/send-now",
            json={
                "organization_id": ORG_ID,
                "recipients": ["not-an-email"],
            },
        )
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# Report templates
# ---------------------------------------------------------------------------

class TestReportTemplates:

    @pytest.mark.asyncio
    async def test_get_templates(self, client: AsyncClient):
        response = await client.get("/api/v1/exports/templates")
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        templates = data["templates"]
        assert len(templates) >= 1
        # Validate template structure
        for t in templates:
            assert "id" in t
            assert "name" in t
            assert "description" in t
