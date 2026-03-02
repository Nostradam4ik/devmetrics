from sqlalchemy import Column, String, Integer, DateTime, Date, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.core.database import Base


class DeveloperMetricsDaily(Base):
    __tablename__ = "developer_metrics_daily"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    developer_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)

    # Commit Metrics
    commits_count = Column(Integer, default=0)
    lines_added = Column(Integer, default=0)
    lines_deleted = Column(Integer, default=0)
    files_changed = Column(Integer, default=0)

    # PR Metrics
    prs_opened = Column(Integer, default=0)
    prs_merged = Column(Integer, default=0)
    prs_closed = Column(Integer, default=0)
    avg_pr_cycle_time_hours = Column(Numeric, nullable=True)

    # Review Metrics
    reviews_given = Column(Integer, default=0)
    reviews_received = Column(Integer, default=0)
    avg_review_time_hours = Column(Numeric, nullable=True)

    # Issue Metrics
    issues_opened = Column(Integer, default=0)
    issues_closed = Column(Integer, default=0)

    # Quality Metrics
    code_churn_ratio = Column(Numeric, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    __table_args__ = (
        UniqueConstraint("developer_id", "date", name="uq_dev_metrics_date"),
    )

    def __repr__(self):
        return f"<DeveloperMetricsDaily {self.developer_id} - {self.date}>"


class TeamMetricsDaily(Base):
    __tablename__ = "team_metrics_daily"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    repository_id = Column(UUID(as_uuid=True), nullable=False)
    date = Column(Date, nullable=False, index=True)

    # Team Stats
    active_developers = Column(Integer, default=0)
    total_commits = Column(Integer, default=0)
    total_prs_opened = Column(Integer, default=0)
    total_prs_merged = Column(Integer, default=0)
    avg_pr_cycle_time_hours = Column(Numeric, nullable=True)
    avg_review_time_hours = Column(Numeric, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "organization_id", "repository_id", "date", name="uq_team_metrics_date"
        ),
    )

    def __repr__(self):
        return f"<TeamMetricsDaily {self.organization_id} - {self.date}>"
