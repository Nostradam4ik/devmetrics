from sqlalchemy import Column, String, Integer, DateTime, Numeric, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
from app.core.database import Base


class PullRequest(Base):
    __tablename__ = "pull_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repository_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    developer_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    # GitHub Data
    github_pr_id = Column(Integer, nullable=False)
    number = Column(Integer, nullable=False)
    title = Column(Text, nullable=True)
    body = Column(Text, nullable=True)
    state = Column(String(20), nullable=True, index=True)

    # Branches
    head_branch = Column(String(255), nullable=True)
    base_branch = Column(String(255), nullable=True)

    # Stats
    additions = Column(Integer, default=0)
    deletions = Column(Integer, default=0)
    changed_files = Column(Integer, default=0)
    commits_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)

    # Metrics
    cycle_time_hours = Column(Numeric, nullable=True)
    review_time_hours = Column(Numeric, nullable=True)
    merge_time_hours = Column(Numeric, nullable=True)

    # Labels
    labels = Column(JSONB, nullable=True)

    # Timestamps
    created_at = Column(DateTime, nullable=False, index=True)
    updated_at = Column(DateTime, nullable=True)
    merged_at = Column(DateTime, nullable=True, index=True)
    closed_at = Column(DateTime, nullable=True)
    first_review_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("repository_id", "github_pr_id", name="uq_repo_pr"),
    )

    def __repr__(self):
        return f"<PullRequest #{self.number}>"


class PrReview(Base):
    __tablename__ = "pr_reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pull_request_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    reviewer_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    # GitHub Data
    github_review_id = Column(Integer, nullable=False)
    state = Column(String(50), nullable=True)
    body = Column(Text, nullable=True)

    # Metrics
    review_time_hours = Column(Numeric, nullable=True)

    # Timestamps
    submitted_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "pull_request_id", "github_review_id", name="uq_pr_review"
        ),
    )

    def __repr__(self):
        return f"<PrReview {self.github_review_id}>"
