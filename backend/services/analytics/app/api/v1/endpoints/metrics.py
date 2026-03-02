from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta
from typing import Optional
from app.core.database import get_db
from app.core.cache import cache_service
from app.services.metrics_calculator import MetricsCalculator

router = APIRouter()


@router.get("/developer/{developer_id}")
async def get_developer_metrics(
    developer_id: str,
    organization_id: str = Query(...),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Get metrics for a specific developer."""
    end = datetime.fromisoformat(end_date) if end_date else datetime.utcnow()
    start = (
        datetime.fromisoformat(start_date) if start_date else end - timedelta(days=30)
    )

    cache_key = f"metrics:developer:{developer_id}:{start.date()}:{end.date()}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached

    metrics = await MetricsCalculator.get_developer_metrics(
        db=db,
        organization_id=organization_id,
        developer_id=developer_id,
        start_date=start,
        end_date=end,
    )

    await cache_service.set(cache_key, metrics, ttl=300)
    return metrics


@router.get("/team")
async def get_team_metrics(
    organization_id: str = Query(...),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated metrics for the entire team."""
    end = datetime.fromisoformat(end_date) if end_date else datetime.utcnow()
    start = (
        datetime.fromisoformat(start_date) if start_date else end - timedelta(days=30)
    )

    cache_key = f"metrics:team:{organization_id}:{start.date()}:{end.date()}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached

    metrics = await MetricsCalculator.get_team_metrics(
        db=db,
        organization_id=organization_id,
        start_date=start,
        end_date=end,
    )

    await cache_service.set(cache_key, metrics, ttl=300)
    return metrics


@router.get("/timeseries")
async def get_time_series(
    organization_id: str = Query(...),
    metric_type: str = Query(..., description="Type: commits, prs, additions"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    granularity: str = Query("day", description="Granularity: day, week, month"),
    db: AsyncSession = Depends(get_db),
):
    """Get time series data for charts."""
    end = datetime.fromisoformat(end_date) if end_date else datetime.utcnow()
    start = (
        datetime.fromisoformat(start_date) if start_date else end - timedelta(days=30)
    )

    cache_key = f"timeseries:{organization_id}:{metric_type}:{start.date()}:{end.date()}:{granularity}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached

    data = await MetricsCalculator.get_time_series_data(
        db=db,
        organization_id=organization_id,
        metric_type=metric_type,
        start_date=start,
        end_date=end,
        granularity=granularity,
    )

    result = {"data": data, "metric_type": metric_type, "granularity": granularity}
    await cache_service.set(cache_key, result, ttl=300)
    return result


@router.get("/summary")
async def get_metrics_summary(
    organization_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Get a quick summary of key metrics (for dashboard cards)."""
    cache_key = f"metrics:summary:{organization_id}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached

    end = datetime.utcnow()
    start = end - timedelta(days=7)

    team_metrics = await MetricsCalculator.get_team_metrics(
        db=db,
        organization_id=organization_id,
        start_date=start,
        end_date=end,
    )

    # Previous week for comparison
    prev_end = start
    prev_start = prev_end - timedelta(days=7)

    prev_metrics = await MetricsCalculator.get_team_metrics(
        db=db,
        organization_id=organization_id,
        start_date=prev_start,
        end_date=prev_end,
    )

    def calc_change(current, previous):
        if previous == 0:
            return 0
        return round(((current - previous) / previous) * 100, 1)

    summary = {
        "total_commits": {
            "value": team_metrics["commits"]["total"],
            "change": calc_change(
                team_metrics["commits"]["total"],
                prev_metrics["commits"]["total"],
            ),
        },
        "pull_requests": {
            "value": team_metrics["pull_requests"]["total"],
            "change": calc_change(
                team_metrics["pull_requests"]["total"],
                prev_metrics["pull_requests"]["total"],
            ),
        },
        "active_developers": {
            "value": team_metrics["active_developers"],
            "change": calc_change(
                team_metrics["active_developers"],
                prev_metrics["active_developers"],
            ),
        },
        "avg_cycle_time": {
            "value": team_metrics["pull_requests"]["avg_cycle_time_hours"],
            "change": calc_change(
                team_metrics["pull_requests"]["avg_cycle_time_hours"],
                prev_metrics["pull_requests"]["avg_cycle_time_hours"],
            ),
        },
    }

    await cache_service.set(cache_key, summary, ttl=300)
    return summary
