from celery import Task
from datetime import datetime, timedelta
from typing import Dict
from sqlalchemy import select
from app.workers.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.clients.github import GitHubClient
from app.models.repository import Repository
from app.models.developer import Developer
from app.models.commit import Commit
from app.models.pull_request import PullRequest
from app.core.config import settings
import asyncio


class AsyncTask(Task):
    """Base task with async support."""

    def __call__(self, *args, **kwargs):
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(self.run_async(*args, **kwargs))
        finally:
            loop.close()


@celery_app.task(base=AsyncTask, name="app.workers.github_sync.sync_repository")
async def sync_repository(repository_id: str):
    """Sync a single repository."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Repository).where(Repository.id == repository_id)
        )
        repo = result.scalar_one_or_none()

        if not repo or not repo.is_active:
            return {"status": "skipped", "reason": "repository not active"}

        github_client = GitHubClient(repo.github_access_token)

        # Determine sync period
        if repo.last_synced_at:
            since = repo.last_synced_at
        else:
            since = datetime.utcnow() - timedelta(days=settings.FULL_SYNC_DAYS)

        # Sync commits
        commits_count = await sync_commits(db, github_client, repo, since)

        # Sync pull requests
        prs_count = await sync_pull_requests(db, github_client, repo)

        # Update last sync time
        repo.last_synced_at = datetime.utcnow()
        await db.commit()

        return {
            "status": "success",
            "repository_id": str(repository_id),
            "commits": commits_count,
            "pull_requests": prs_count,
            "synced_at": datetime.utcnow().isoformat(),
        }


async def sync_commits(
    db, client: GitHubClient, repo: Repository, since: datetime
) -> int:
    """Sync commits for repository."""
    owner, name = repo.full_name.split("/")
    cursor = None
    total_commits = 0

    while True:
        history = await client.get_commits(
            owner=owner, name=name, since=since, cursor=cursor, limit=100
        )

        commits = history.get("nodes", [])
        if not commits:
            break

        for commit_data in commits:
            # Find or create developer
            author = commit_data.get("author", {})
            user = author.get("user")

            if user:
                developer = await find_or_create_developer(
                    db, repo.organization_id, user
                )
            else:
                developer = None

            commit = Commit(
                repository_id=repo.id,
                developer_id=developer.id if developer else None,
                sha=commit_data["oid"],
                message=commit_data.get("message"),
                author_name=author.get("name"),
                author_email=author.get("email"),
                additions=commit_data.get("additions", 0),
                deletions=commit_data.get("deletions", 0),
                files_changed=commit_data.get("changedFiles", 0),
                committed_at=datetime.fromisoformat(
                    commit_data["committedDate"].replace("Z", "+00:00")
                ),
            )

            db.add(commit)
            total_commits += 1

        await db.commit()

        page_info = history.get("pageInfo", {})
        if not page_info.get("hasNextPage"):
            break
        cursor = page_info.get("endCursor")

        if total_commits >= settings.MAX_COMMITS_PER_SYNC:
            break

    return total_commits


async def sync_pull_requests(db, client: GitHubClient, repo: Repository) -> int:
    """Sync pull requests for repository."""
    owner, name = repo.full_name.split("/")
    cursor = None
    total_prs = 0

    while True:
        prs_data = await client.get_pull_requests(
            owner=owner, name=name, cursor=cursor, limit=50
        )

        prs = prs_data.get("nodes", [])
        if not prs:
            break

        for pr_data in prs:
            author = pr_data.get("author")
            if author:
                developer = await find_or_create_developer(
                    db, repo.organization_id, author
                )
            else:
                developer = None

            # Calculate metrics
            first_review = pr_data.get("reviews", {}).get("nodes", [])
            first_review_at = None
            if first_review:
                first_review_at = datetime.fromisoformat(
                    first_review[0]["createdAt"].replace("Z", "+00:00")
                )

            created_at = datetime.fromisoformat(
                pr_data["createdAt"].replace("Z", "+00:00")
            )
            merged_at = pr_data.get("mergedAt")
            if merged_at:
                merged_at = datetime.fromisoformat(merged_at.replace("Z", "+00:00"))
                cycle_time_hours = (merged_at - created_at).total_seconds() / 3600
            else:
                cycle_time_hours = None

            pr = PullRequest(
                repository_id=repo.id,
                developer_id=developer.id if developer else None,
                github_pr_id=pr_data["databaseId"],
                number=pr_data["number"],
                title=pr_data.get("title"),
                body=pr_data.get("body"),
                state=pr_data["state"].lower(),
                head_branch=pr_data.get("headRefName"),
                base_branch=pr_data.get("baseRefName"),
                additions=pr_data.get("additions", 0),
                deletions=pr_data.get("deletions", 0),
                changed_files=pr_data.get("changedFiles", 0),
                commits_count=pr_data.get("commits", {}).get("totalCount", 0),
                comments_count=pr_data.get("comments", {}).get("totalCount", 0),
                cycle_time_hours=cycle_time_hours,
                labels=[
                    label["name"]
                    for label in pr_data.get("labels", {}).get("nodes", [])
                ],
                created_at=created_at,
                merged_at=merged_at,
                first_review_at=first_review_at,
            )

            db.add(pr)
            total_prs += 1

        await db.commit()

        page_info = prs_data.get("pageInfo", {})
        if not page_info.get("hasNextPage"):
            break
        cursor = page_info.get("endCursor")

    return total_prs


async def find_or_create_developer(db, org_id, github_user: Dict):
    """Find or create developer from GitHub user data."""
    result = await db.execute(
        select(Developer).where(
            Developer.organization_id == org_id,
            Developer.github_id == github_user.get("databaseId"),
        )
    )
    developer = result.scalar_one_or_none()

    if not developer:
        developer = Developer(
            organization_id=org_id,
            github_id=github_user.get("databaseId"),
            github_login=github_user.get("login"),
            name=github_user.get("name"),
            avatar_url=github_user.get("avatarUrl"),
        )
        db.add(developer)
        await db.commit()
        await db.refresh(developer)

    return developer


@celery_app.task(
    base=AsyncTask, name="app.workers.github_sync.sync_all_repositories"
)
async def sync_all_repositories():
    """Sync all active repositories."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Repository).where(Repository.is_active == True)  # noqa: E712
        )
        repositories = result.scalars().all()

        for repo in repositories:
            sync_repository.delay(str(repo.id))

        return {
            "status": "dispatched",
            "count": len(repositories),
            "timestamp": datetime.utcnow().isoformat(),
        }
