from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class RepositoryCreate(BaseModel):
    github_repo_id: int
    full_name: str
    name: str
    description: Optional[str] = None
    default_branch: str = "main"
    is_private: bool = False
    language: Optional[str] = None
    github_access_token: str


class RepositoryUpdate(BaseModel):
    description: Optional[str] = None
    is_active: Optional[bool] = None
    github_access_token: Optional[str] = None


class RepositoryResponse(BaseModel):
    id: UUID
    organization_id: UUID
    github_repo_id: int
    full_name: str
    name: str
    description: Optional[str] = None
    default_branch: str
    is_private: bool
    language: Optional[str] = None
    is_active: bool
    last_synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RepositoryListResponse(BaseModel):
    repositories: List[RepositoryResponse]
    total: int


class SyncRequest(BaseModel):
    repository_id: str


class SyncStatusResponse(BaseModel):
    repository_id: str
    status: str
    last_synced_at: Optional[datetime] = None
    commits_synced: Optional[int] = None
    prs_synced: Optional[int] = None
