from pydantic import BaseModel
from typing import Optional, Generic, TypeVar, List
from datetime import datetime

T = TypeVar("T")


class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str
    version: str
    environment: str


class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None


class PaginationParams(BaseModel):
    page: int = 1
    per_page: int = 20


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    per_page: int
    pages: int


class TimestampMixin(BaseModel):
    created_at: datetime
    updated_at: Optional[datetime] = None
