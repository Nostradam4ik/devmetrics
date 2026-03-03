"""
Export endpoints — PDF and CSV report generation.
"""
import io
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.metrics_calculator import MetricsCalculator
from app.services.report_generator import ReportGenerator
from app.services.email_report_service import EmailReportService

router = APIRouter()


def _parse_dates(start_date: Optional[str], end_date: Optional[str], days: int = 30):
    end = datetime.fromisoformat(end_date) if end_date else datetime.utcnow()
    start = datetime.fromisoformat(start_date) if start_date else end - timedelta(days=days)
    return start, end


# ---------------------------------------------------------------------------
# PDF export
# ---------------------------------------------------------------------------

@router.get("/pdf/team")
async def export_team_pdf(
    organization_id: str = Query(...),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    report_title: str = Query("Team Performance Report"),
    db: AsyncSession = Depends(get_db),
):
    """Generate and download a PDF team report."""
    start, end = _parse_dates(start_date, end_date, days=30)

    metrics = await MetricsCalculator.get_team_metrics(
        db=db,
        organization_id=organization_id,
        start_date=start,
        end_date=end,
    )

    try:
        pdf_bytes = ReportGenerator.generate_pdf(
            org_id=organization_id,
            metrics=metrics,
            period_start=start.strftime("%Y-%m-%d"),
            period_end=end.strftime("%Y-%m-%d"),
            report_title=report_title,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    filename = f"devmetrics-report-{start.strftime('%Y%m%d')}-{end.strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# CSV exports
# ---------------------------------------------------------------------------

@router.get("/csv/team")
async def export_team_csv(
    organization_id: str = Query(...),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Export team metrics as CSV."""
    start, end = _parse_dates(start_date, end_date, days=30)

    metrics = await MetricsCalculator.get_team_metrics(
        db=db,
        organization_id=organization_id,
        start_date=start,
        end_date=end,
    )

    csv_content = ReportGenerator.generate_team_csv(
        metrics=metrics,
        period_start=start.strftime("%Y-%m-%d"),
        period_end=end.strftime("%Y-%m-%d"),
    )

    filename = f"devmetrics-team-{start.strftime('%Y%m%d')}-{end.strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_content.encode("utf-8"),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/csv/timeseries")
async def export_timeseries_csv(
    organization_id: str = Query(...),
    metric_type: str = Query(..., description="commits | prs | additions"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    granularity: str = Query("day"),
    db: AsyncSession = Depends(get_db),
):
    """Export time series data as CSV."""
    start, end = _parse_dates(start_date, end_date, days=30)

    data = await MetricsCalculator.get_time_series_data(
        db=db,
        organization_id=organization_id,
        metric_type=metric_type,
        start_date=start,
        end_date=end,
        granularity=granularity,
    )

    csv_content = ReportGenerator.generate_timeseries_csv(
        data=data,
        metric_type=metric_type,
        period_start=start.strftime("%Y-%m-%d"),
        period_end=end.strftime("%Y-%m-%d"),
    )

    filename = f"devmetrics-{metric_type}-{start.strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_content.encode("utf-8"),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# Scheduled email reports
# ---------------------------------------------------------------------------

class ScheduleReportRequest(BaseModel):
    organization_id: str
    recipients: List[str]
    report_title: str = "Weekly Team Report"
    days: int = 7


@router.post("/email/send-now")
async def send_report_now(
    payload: ScheduleReportRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Trigger an immediate email report to a list of recipients."""
    end = datetime.utcnow()
    start = end - timedelta(days=payload.days)

    metrics = await MetricsCalculator.get_team_metrics(
        db=db,
        organization_id=payload.organization_id,
        start_date=start,
        end_date=end,
    )

    try:
        pdf_bytes = ReportGenerator.generate_pdf(
            org_id=payload.organization_id,
            metrics=metrics,
            period_start=start.strftime("%Y-%m-%d"),
            period_end=end.strftime("%Y-%m-%d"),
            report_title=payload.report_title,
        )
    except RuntimeError:
        # WeasyPrint not available — send without PDF attachment
        pdf_bytes = None

    body_html = EmailReportService.build_report_email_body(
        org_name=payload.organization_id,
        period_start=start.strftime("%b %d, %Y"),
        period_end=end.strftime("%b %d, %Y"),
        total_commits=metrics["commits"]["total"],
        active_devs=metrics["active_developers"],
        merge_rate=metrics["pull_requests"]["merge_rate"],
        avg_cycle_time=metrics["pull_requests"]["avg_cycle_time_hours"],
    )

    async def _send():
        await EmailReportService.send_report(
            to_emails=payload.recipients,
            subject=f"{payload.report_title} — {start.strftime('%b %d')} to {end.strftime('%b %d, %Y')}",
            body_html=body_html,
            pdf_attachment=pdf_bytes,
            filename=f"devmetrics-report-{start.strftime('%Y%m%d')}.pdf",
        )

    background_tasks.add_task(_send)

    return {
        "success": True,
        "message": f"Report queued for {len(payload.recipients)} recipient(s).",
        "period": {"start": start.isoformat(), "end": end.isoformat()},
    }


# ---------------------------------------------------------------------------
# Report templates list
# ---------------------------------------------------------------------------

REPORT_TEMPLATES = [
    {
        "id": "weekly-team",
        "name": "Weekly Team Summary",
        "description": "Commits, PRs, cycle time and top contributors for the past 7 days.",
        "days": 7,
        "sections": ["kpis", "code_volume", "contributors"],
    },
    {
        "id": "monthly-executive",
        "name": "Monthly Executive Report",
        "description": "High-level KPIs and trends for the past 30 days. Ideal for stakeholders.",
        "days": 30,
        "sections": ["kpis", "code_volume", "contributors", "insights"],
    },
    {
        "id": "quarterly-review",
        "name": "Quarterly Engineering Review",
        "description": "Full 90-day breakdown with time series, contributor analysis, and AI insights.",
        "days": 90,
        "sections": ["kpis", "code_volume", "contributors", "timeseries", "insights"],
    },
    {
        "id": "sprint-retrospective",
        "name": "Sprint Retrospective (14 days)",
        "description": "Two-week sprint metrics: velocity, PR health, and team contributions.",
        "days": 14,
        "sections": ["kpis", "code_volume", "contributors"],
    },
]


@router.get("/templates")
async def list_report_templates():
    """Return available report templates."""
    return {"templates": REPORT_TEMPLATES}
