"""
ML Analytics endpoints — statistical insights powered by MLAnalyticsService.

Endpoints:
  GET  /ml/velocity-trend          — linear regression on commit/PR time series
  GET  /ml/anomalies                — anomaly detection on activity time series
  GET  /ml/developer-score/{id}    — composite developer performance score
  GET  /ml/team-health              — team health score + flags
  GET  /ml/sprint-prediction        — next sprint velocity prediction
"""
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.metrics_calculator import MetricsCalculator
from app.services.ml_analytics import ml_service

router = APIRouter()
logger = logging.getLogger(__name__)


def _parse_dates(start_date: Optional[str], end_date: Optional[str], days: int = 30):
    end = datetime.fromisoformat(end_date) if end_date else datetime.utcnow()
    start = datetime.fromisoformat(start_date) if start_date else end - timedelta(days=days)
    return start, end


# ---------------------------------------------------------------------------
# Velocity trend
# ---------------------------------------------------------------------------

@router.get("/velocity-trend")
async def velocity_trend(
    organization_id: str = Query(...),
    metric: str = Query("commits", description="commits | prs | additions"),
    days: int = Query(30, ge=7, le=365),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Run linear regression on the chosen metric's daily time series.
    Returns slope, R², trend classification, 7-day forecast.
    """
    start, end = _parse_dates(start_date, end_date, days)

    time_series = await MetricsCalculator.get_time_series_data(
        db=db,
        organization_id=organization_id,
        metric_type=metric,
        start_date=start,
        end_date=end,
        granularity="day",
    )

    if not time_series:
        raise HTTPException(status_code=404, detail="No time series data found for this organization.")

    result = ml_service.analyze_velocity_trend(time_series)
    result["metric"] = metric
    result["period_days"] = days
    return result


# ---------------------------------------------------------------------------
# Anomaly detection
# ---------------------------------------------------------------------------

@router.get("/anomalies")
async def detect_anomalies(
    organization_id: str = Query(...),
    metric: str = Query("commits"),
    method: str = Query("combined", description="zscore | iqr | combined"),
    days: int = Query(60, ge=14, le=365),
    db: AsyncSession = Depends(get_db),
):
    """
    Detect anomalous activity days in the time series.
    Returns list of anomalous points with dates, values, Z-scores.
    """
    start = datetime.utcnow() - timedelta(days=days)
    end = datetime.utcnow()

    time_series = await MetricsCalculator.get_time_series_data(
        db=db,
        organization_id=organization_id,
        metric_type=metric,
        start_date=start,
        end_date=end,
        granularity="day",
    )

    if not time_series:
        raise HTTPException(status_code=404, detail="No time series data found.")

    result = ml_service.detect_anomalies(time_series, method=method)
    result["metric"] = metric
    result["period_days"] = days
    return result


# ---------------------------------------------------------------------------
# Developer performance score
# ---------------------------------------------------------------------------

@router.get("/developer-score/{developer_id}")
async def developer_score(
    developer_id: str,
    organization_id: str = Query(...),
    days: int = Query(30, ge=7, le=90),
    db: AsyncSession = Depends(get_db),
):
    """
    Compute a 0–100 composite performance score for a developer.
    Dimensions: throughput (40%), code quality (30%), collaboration (30%).
    """
    start = datetime.utcnow() - timedelta(days=days)
    end = datetime.utcnow()

    metrics = await MetricsCalculator.get_developer_metrics(
        db=db,
        organization_id=organization_id,
        developer_id=developer_id,
        start_date=start,
        end_date=end,
    )

    commits_data = metrics.get("commits", {})
    pr_data = metrics.get("pull_requests", {})

    score_result = ml_service.compute_developer_score(
        commits=commits_data.get("total", 0),
        additions=commits_data.get("additions", 0),
        deletions=commits_data.get("deletions", 0),
        prs_merged=pr_data.get("merged", 0),
        prs_total=pr_data.get("total", 0),
        avg_cycle_time_hours=pr_data.get("avg_cycle_time_hours", 24.0),
        period_days=days,
    )

    return {
        "developer_id": developer_id,
        "period_days": days,
        **score_result,
        "raw_metrics": metrics,
    }


# ---------------------------------------------------------------------------
# Team health
# ---------------------------------------------------------------------------

@router.get("/team-health")
async def team_health(
    organization_id: str = Query(...),
    days: int = Query(30, ge=7, le=90),
    db: AsyncSession = Depends(get_db),
):
    """
    Compute a 0–100 team health score with actionable flags.
    Dimensions: participation, velocity stability, PR health, contribution balance.
    """
    start = datetime.utcnow() - timedelta(days=days)
    end = datetime.utcnow()

    team_metrics = await MetricsCalculator.get_team_metrics(
        db=db,
        organization_id=organization_id,
        start_date=start,
        end_date=end,
    )

    commit_series = await MetricsCalculator.get_time_series_data(
        db=db,
        organization_id=organization_id,
        metric_type="commits",
        start_date=start,
        end_date=end,
        granularity="day",
    )

    pr_data = team_metrics.get("pull_requests", {})

    health_result = ml_service.compute_team_health(
        active_developers=team_metrics.get("active_developers", 0),
        team_size=team_metrics.get("team_size", 1),
        commit_time_series=commit_series,
        avg_cycle_time_hours=pr_data.get("avg_cycle_time_hours", 24.0),
        merge_rate=pr_data.get("merge_rate", 0.0),
        top_contributors=team_metrics.get("top_contributors", []),
    )

    return {
        "organization_id": organization_id,
        "period_days": days,
        **health_result,
        "team_metrics": team_metrics,
    }


# ---------------------------------------------------------------------------
# Sprint velocity prediction
# ---------------------------------------------------------------------------

@router.get("/sprint-prediction")
async def sprint_prediction(
    organization_id: str = Query(...),
    sprint_length_days: int = Query(14, ge=5, le=30),
    num_sprints: int = Query(8, ge=3, le=20, description="Number of historical sprints to analyse"),
    db: AsyncSession = Depends(get_db),
):
    """
    Predict next sprint velocity using exponentially-weighted moving average + trend.
    Slices the last N sprints from the commit time series.
    """
    total_days = sprint_length_days * num_sprints
    start = datetime.utcnow() - timedelta(days=total_days)
    end = datetime.utcnow()

    daily_series = await MetricsCalculator.get_time_series_data(
        db=db,
        organization_id=organization_id,
        metric_type="commits",
        start_date=start,
        end_date=end,
        granularity="day",
    )

    if not daily_series:
        raise HTTPException(status_code=404, detail="No commit data found for this organization.")

    # Aggregate daily into sprint buckets
    sprint_velocities = []
    for i in range(num_sprints):
        sprint_start = i * sprint_length_days
        sprint_end = sprint_start + sprint_length_days
        bucket = daily_series[sprint_start:sprint_end]
        sprint_velocities.append(float(sum(p["value"] for p in bucket)))

    prediction = ml_service.predict_sprint_velocity(
        historical_velocities=sprint_velocities,
        sprint_length_days=sprint_length_days,
    )

    return {
        "organization_id": organization_id,
        "sprint_length_days": sprint_length_days,
        "num_sprints_analyzed": num_sprints,
        "historical_velocities": [round(v, 1) for v in sprint_velocities],
        **prediction,
    }
