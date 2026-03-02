from pydantic import BaseModel
from typing import Dict, Optional, List
from datetime import datetime


class InsightRequest(BaseModel):
    organization_id: str
    metrics_data: Dict


class WeeklyReportRequest(BaseModel):
    organization_id: str
    metrics_data: Dict


class QueryRequest(BaseModel):
    query: str
    context_data: Optional[Dict] = None


class InsightResponse(BaseModel):
    success: bool
    insights: Dict


class QueryResponse(BaseModel):
    success: bool
    query: str
    answer: str


class Suggestion(BaseModel):
    title: str
    description: str
    priority: str
    category: Optional[str] = None


class SuggestionsResponse(BaseModel):
    success: bool
    suggestions: List[Suggestion]


class WeeklyReportResponse(BaseModel):
    success: bool
    report: str
    generated_at: datetime


class InsightListItem(BaseModel):
    id: str
    type: str
    title: str
    summary: Optional[str]
    severity: Optional[str]
    category: Optional[str]
    is_read: bool
    generated_at: datetime

    class Config:
        from_attributes = True


class InsightListResponse(BaseModel):
    insights: List[InsightListItem]
    total: int
