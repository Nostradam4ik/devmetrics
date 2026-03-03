from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime
from app.core.database import get_db
from app.services.groq_service import groq_service
from app.models.insight import Insight
from app.schemas.insights import (
    InsightRequest,
    WeeklyReportRequest,
    QueryRequest,
    InsightResponse,
    QueryResponse,
    SuggestionsResponse,
    Suggestion,
    WeeklyReportResponse,
    InsightListResponse,
    InsightListItem,
)

router = APIRouter()


@router.post("/generate", response_model=InsightResponse)
async def generate_insights(
    request: InsightRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate AI insights from metrics data."""
    try:
        insights = await groq_service.generate_insights(request.metrics_data)

        # Save to database
        insight = Insight(
            organization_id=request.organization_id,
            type="team_analysis",
            title="Team Performance Analysis",
            content=insights["summary"],
            summary=insights["summary"][:500] if insights["summary"] else None,
            severity="info",
            category="performance",
            model_used=insights["model_used"],
        )
        db.add(insight)
        await db.commit()

        return {"success": True, "insights": insights}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/weekly-report", response_model=WeeklyReportResponse)
async def generate_weekly_report(
    request: WeeklyReportRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a weekly team report."""
    try:
        report = await groq_service.generate_weekly_report(request.metrics_data)

        # Save to database
        insight = Insight(
            organization_id=request.organization_id,
            type="weekly_report",
            title=f"Weekly Report - {datetime.utcnow().strftime('%Y-%m-%d')}",
            content=report,
            summary=report[:500] if report else None,
            severity="info",
            category="report",
            model_used=groq_service.model,
        )
        db.add(insight)
        await db.commit()

        return {
            "success": True,
            "report": report,
            "generated_at": datetime.utcnow(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query", response_model=QueryResponse)
async def answer_query(request: QueryRequest):
    """Answer natural language query about metrics."""
    try:
        answer = await groq_service.answer_query(
            query=request.query,
            context_data=request.context_data or {},
        )
        return {"success": True, "query": request.query, "answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions", response_model=SuggestionsResponse)
async def get_suggestions(
    organization_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get AI-powered improvement suggestions based on recent insights."""
    # Fetch recent insights for context
    result = await db.execute(
        select(Insight)
        .where(Insight.organization_id == organization_id)
        .order_by(desc(Insight.generated_at))
        .limit(5)
    )
    recent_insights = result.scalars().all()

    if recent_insights:
        context = "\n".join([i.content for i in recent_insights if i.content])
        try:
            suggestions_text = await groq_service.generate_completion(
                prompt=f"Based on these recent team insights, provide 3-4 specific improvement suggestions:\n\n{context[:2000]}",
                system_prompt="You are a software engineering coach. Return suggestions as a JSON array with objects having 'title', 'description', 'priority' (high/medium/low), and 'category' fields. Return ONLY the JSON array, no other text.",
                temperature=0.5,
            )
            import json

            suggestions_data = json.loads(suggestions_text)
            suggestions = [Suggestion(**s) for s in suggestions_data]
        except Exception:
            suggestions = _default_suggestions()
    else:
        suggestions = _default_suggestions()

    return {"success": True, "suggestions": suggestions}


@router.get("/list", response_model=InsightListResponse)
async def list_insights(
    organization_id: str,
    type: str = Query(None, description="Filter by insight type"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List insights for an organization."""
    query = select(Insight).where(Insight.organization_id == organization_id)

    if type:
        query = query.where(Insight.type == type)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Fetch
    result = await db.execute(
        query.order_by(desc(Insight.generated_at)).offset(offset).limit(limit)
    )
    insights = result.scalars().all()

    return {
        "insights": [
            InsightListItem(
                id=str(i.id),
                type=i.type,
                title=i.title,
                summary=i.summary,
                severity=i.severity,
                category=i.category,
                is_read=i.is_read,
                generated_at=i.generated_at,
            )
            for i in insights
        ],
        "total": total,
    }


@router.patch("/{insight_id}/read")
async def mark_as_read(
    insight_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Mark an insight as read."""
    result = await db.execute(select(Insight).where(Insight.id == insight_id))
    insight = result.scalar_one_or_none()

    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    insight.is_read = True
    await db.commit()
    return {"success": True}


def _default_suggestions() -> list[Suggestion]:
    return [
        Suggestion(
            title="Reduce PR Cycle Time",
            description="Consider implementing automated code review checks and setting SLAs for code reviews to keep PRs moving.",
            priority="high",
            category="process",
        ),
        Suggestion(
            title="Increase Code Review Coverage",
            description="Ensure every PR gets at least one review. Pair less experienced reviewers with seniors for knowledge sharing.",
            priority="medium",
            category="quality",
        ),
        Suggestion(
            title="Balance Workload Distribution",
            description="Monitor commit distribution across team members. Large imbalances may indicate knowledge silos.",
            priority="medium",
            category="team",
        ),
    ]
