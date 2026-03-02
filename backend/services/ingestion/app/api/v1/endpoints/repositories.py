from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.models.repository import Repository
from app.schemas.repository import (
    RepositoryCreate,
    RepositoryUpdate,
    RepositoryResponse,
    RepositoryListResponse,
    SyncStatusResponse,
)
from app.workers.github_sync import sync_repository

router = APIRouter()


@router.get("/", response_model=RepositoryListResponse)
async def list_repositories(
    organization_id: str = Query(...),
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List all repositories for an organization."""
    query = (
        select(Repository)
        .where(Repository.organization_id == organization_id)
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    repositories = result.scalars().all()

    count_result = await db.execute(
        select(func.count(Repository.id)).where(
            Repository.organization_id == organization_id
        )
    )
    total = count_result.scalar() or 0

    return RepositoryListResponse(
        repositories=[RepositoryResponse.model_validate(r) for r in repositories],
        total=total,
    )


@router.post("/", response_model=RepositoryResponse, status_code=201)
async def add_repository(
    repo_data: RepositoryCreate,
    organization_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Add a new repository to track."""
    # Check for duplicate
    existing = await db.execute(
        select(Repository).where(
            Repository.organization_id == organization_id,
            Repository.github_repo_id == repo_data.github_repo_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Repository already exists")

    repo = Repository(
        organization_id=organization_id,
        github_repo_id=repo_data.github_repo_id,
        full_name=repo_data.full_name,
        name=repo_data.name,
        description=repo_data.description,
        default_branch=repo_data.default_branch,
        is_private=repo_data.is_private,
        language=repo_data.language,
        github_access_token=repo_data.github_access_token,
        is_active=True,
    )
    db.add(repo)
    await db.commit()
    await db.refresh(repo)

    # Trigger initial sync
    sync_repository.delay(str(repo.id))

    return RepositoryResponse.model_validate(repo)


@router.get("/{repository_id}", response_model=RepositoryResponse)
async def get_repository(
    repository_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific repository."""
    result = await db.execute(
        select(Repository).where(Repository.id == repository_id)
    )
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return RepositoryResponse.model_validate(repo)


@router.patch("/{repository_id}", response_model=RepositoryResponse)
async def update_repository(
    repository_id: str,
    update_data: RepositoryUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update repository settings."""
    result = await db.execute(
        select(Repository).where(Repository.id == repository_id)
    )
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(repo, key, value)

    await db.commit()
    await db.refresh(repo)
    return RepositoryResponse.model_validate(repo)


@router.delete("/{repository_id}")
async def remove_repository(
    repository_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Remove a repository from tracking."""
    result = await db.execute(
        select(Repository).where(Repository.id == repository_id)
    )
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    await db.delete(repo)
    await db.commit()
    return {"status": "deleted", "repository_id": repository_id}


@router.post("/{repository_id}/sync", response_model=SyncStatusResponse)
async def trigger_sync(
    repository_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger a sync for a repository."""
    result = await db.execute(
        select(Repository).where(Repository.id == repository_id)
    )
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    sync_repository.delay(str(repo.id))

    return SyncStatusResponse(
        repository_id=str(repo.id),
        status="sync_queued",
        last_synced_at=repo.last_synced_at,
    )
