from sqlalchemy import Column, String, Integer, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.core.database import Base


class Developer(Base):
    __tablename__ = "developers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    github_id = Column(Integer, nullable=False, index=True)
    github_login = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    avatar_url = Column(String, nullable=True)
    company = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)

    total_commits = Column(Integer, default=0)
    total_prs = Column(Integer, default=0)
    total_reviews = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    __table_args__ = (
        UniqueConstraint("organization_id", "github_id", name="uq_org_developer"),
    )
