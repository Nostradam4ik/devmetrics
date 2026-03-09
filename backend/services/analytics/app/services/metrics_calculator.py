from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.commit import Commit
from app.models.pull_request import PullRequest
from app.models.developer import Developer
from app.models.repository import Repository


class MetricsCalculator:
    """Service for calculating developer and team metrics."""

    @staticmethod
    async def get_developer_metrics(
        db: AsyncSession,
        organization_id: str,
        developer_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict:
        """Calculate metrics for developer(s)."""
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)

        # Commit metrics
        commits_query = (
            select(Commit)
            .join(Repository, Repository.id == Commit.repository_id)
            .where(
                Repository.organization_id == organization_id,
                Commit.committed_at.between(start_date, end_date),
            )
        )

        if developer_id:
            commits_query = commits_query.where(
                Commit.developer_id == developer_id
            )

        result = await db.execute(commits_query)
        commits = result.scalars().all()

        total_commits = len(commits)
        total_additions = sum(c.additions for c in commits if c.additions)
        total_deletions = sum(c.deletions for c in commits if c.deletions)
        total_files = sum(c.files_changed for c in commits if c.files_changed)

        # Pull request metrics
        prs_query = (
            select(PullRequest)
            .join(Repository, Repository.id == PullRequest.repository_id)
            .where(
                Repository.organization_id == organization_id,
                PullRequest.created_at.between(start_date, end_date),
            )
        )

        if developer_id:
            prs_query = prs_query.where(
                PullRequest.developer_id == developer_id
            )

        result = await db.execute(prs_query)
        prs = result.scalars().all()

        total_prs = len(prs)
        merged_prs = len([pr for pr in prs if pr.state == "merged"])
        closed_prs = len([pr for pr in prs if pr.state == "closed"])

        cycle_times = [
            float(pr.cycle_time_hours)
            for pr in prs
            if pr.cycle_time_hours
        ]
        avg_cycle_time = (
            sum(cycle_times) / len(cycle_times) if cycle_times else 0
        )

        days = (end_date - start_date).days or 1

        return {
            "commits": {
                "total": total_commits,
                "additions": total_additions,
                "deletions": total_deletions,
                "files_changed": total_files,
                "avg_per_day": round(total_commits / days, 1),
            },
            "pull_requests": {
                "total": total_prs,
                "merged": merged_prs,
                "closed": closed_prs,
                "merge_rate": round(
                    (merged_prs / total_prs * 100) if total_prs else 0, 1
                ),
                "avg_cycle_time_hours": round(avg_cycle_time, 2),
            },
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days,
            },
        }

    @staticmethod
    async def get_team_metrics(
        db: AsyncSession,
        organization_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict:
        """Calculate aggregated team metrics."""
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)

        # Get all developers in organization
        dev_result = await db.execute(
            select(Developer).where(
                Developer.organization_id == organization_id
            )
        )
        developers = dev_result.scalars().all()

        # Get commits count per developer
        commits_result = await db.execute(
            select(
                Developer.id,
                Developer.github_login,
                func.count(Commit.id).label("commit_count"),
                func.sum(Commit.additions).label("additions"),
                func.sum(Commit.deletions).label("deletions"),
            )
            .join(Commit, Commit.developer_id == Developer.id)
            .join(Repository, Repository.id == Commit.repository_id)
            .where(
                Repository.organization_id == organization_id,
                Commit.committed_at.between(start_date, end_date),
            )
            .group_by(Developer.id, Developer.github_login)
            .order_by(func.count(Commit.id).desc())
        )

        top_contributors = []
        for row in commits_result:
            top_contributors.append(
                {
                    "developer_id": str(row.id),
                    "github_login": row.github_login,
                    "commits": row.commit_count,
                    "additions": row.additions or 0,
                    "deletions": row.deletions or 0,
                }
            )

        # Get PR metrics
        prs_result = await db.execute(
            select(PullRequest)
            .join(Repository, Repository.id == PullRequest.repository_id)
            .where(
                Repository.organization_id == organization_id,
                PullRequest.created_at.between(start_date, end_date),
            )
        )
        prs = prs_result.scalars().all()

        total_prs = len(prs)
        merged_prs = len([pr for pr in prs if pr.state == "merged"])
        open_prs = len([pr for pr in prs if pr.state == "open"])

        cycle_times = [
            float(pr.cycle_time_hours)
            for pr in prs
            if pr.cycle_time_hours
        ]
        avg_cycle_time = (
            sum(cycle_times) / len(cycle_times) if cycle_times else 0
        )

        return {
            "team_size": len(developers),
            "active_developers": len(top_contributors),
            "commits": {
                "total": sum(dev["commits"] for dev in top_contributors),
                "additions": sum(dev["additions"] for dev in top_contributors),
                "deletions": sum(dev["deletions"] for dev in top_contributors),
            },
            "pull_requests": {
                "total": total_prs,
                "merged": merged_prs,
                "open": open_prs,
                "merge_rate": round(
                    (merged_prs / total_prs * 100) if total_prs else 0, 1
                ),
                "avg_cycle_time_hours": round(avg_cycle_time, 2),
            },
            "top_contributors": top_contributors[:10],
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": (end_date - start_date).days,
            },
        }

    @staticmethod
    async def get_time_series_data(
        db: AsyncSession,
        organization_id: str,
        metric_type: str,
        start_date: datetime,
        end_date: datetime,
        granularity: str = "day",
    ) -> List[Dict]:
        """Get time series data for charts."""
        if metric_type == "commits":
            query = (
                select(
                    func.date(Commit.committed_at).label("date"),
                    func.count(Commit.id).label("value"),
                )
                .join(Repository, Repository.id == Commit.repository_id)
                .where(
                    Repository.organization_id == organization_id,
                    Commit.committed_at.between(start_date, end_date),
                )
                .group_by(func.date(Commit.committed_at))
                .order_by(func.date(Commit.committed_at))
            )
        elif metric_type == "prs":
            query = (
                select(
                    func.date(PullRequest.created_at).label("date"),
                    func.count(PullRequest.id).label("value"),
                )
                .join(Repository, Repository.id == PullRequest.repository_id)
                .where(
                    Repository.organization_id == organization_id,
                    PullRequest.created_at.between(start_date, end_date),
                )
                .group_by(func.date(PullRequest.created_at))
                .order_by(func.date(PullRequest.created_at))
            )
        elif metric_type == "additions":
            query = (
                select(
                    func.date(Commit.committed_at).label("date"),
                    func.sum(Commit.additions).label("value"),
                )
                .join(Repository, Repository.id == Commit.repository_id)
                .where(
                    Repository.organization_id == organization_id,
                    Commit.committed_at.between(start_date, end_date),
                )
                .group_by(func.date(Commit.committed_at))
                .order_by(func.date(Commit.committed_at))
            )
        else:
            return []

        result = await db.execute(query)
        rows = result.all()

        data = []
        for row in rows:
            data.append({"date": row.date.isoformat(), "value": int(row.value or 0)})

        if granularity == "day":
            return MetricsCalculator._fill_missing_dates(
                data, start_date, end_date
            )

        return data

    @staticmethod
    def _fill_missing_dates(
        data: List[Dict], start_date: datetime, end_date: datetime
    ) -> List[Dict]:
        """Fill missing dates in time series with zero values."""
        data_dict = {item["date"]: item["value"] for item in data}

        result = []
        current_date = start_date.date()
        end = end_date.date()

        while current_date <= end:
            date_str = current_date.isoformat()
            result.append({"date": date_str, "value": data_dict.get(date_str, 0)})
            current_date += timedelta(days=1)

        return result
