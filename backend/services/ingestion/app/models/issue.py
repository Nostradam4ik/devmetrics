from sqlalchemy import Column, String, Integer, DateTime, Boolean, Numeric, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
from app.core.database import Base


class Issue(Base):
    __tablename__ = "issues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repository_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    creator_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    assignee_id = Column(UUID(as_uuid=True), nullable=True)

    # GitHub Data
    github_issue_id = Column(Integer, nullable=False)
    number = Column(Integer, nullable=False)
    title = Column(Text, nullable=True)
    body = Column(Text, nullable=True)
    state = Column(String(20), nullable=True, index=True)

    # Labels & Metadata
    labels = Column(JSONB, nullable=True)
    is_pull_request = Column(Boolean, default=False)

    # Metrics
    time_to_close_hours = Column(Numeric, nullable=True)
    comments_count = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, nullable=False, index=True)
    updated_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("repository_id", "github_issue_id", name="uq_repo_issue"),
    )

    def __repr__(self):
        return f"<Issue #{self.number}>"
