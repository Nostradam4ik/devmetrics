from sqlalchemy import Column, String, Integer, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
from app.core.database import Base


class Repository(Base):
    __tablename__ = "repositories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    github_repo_id = Column(Integer, unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    owner_login = Column(String(255), nullable=True)
    description = Column(String, nullable=True)
    html_url = Column(String, nullable=True)
    default_branch = Column(String(255), default="main")

    is_active = Column(Boolean, default=True, index=True)
    is_private = Column(Boolean, default=False)

    language = Column(String(100), nullable=True)
    topics = Column(JSONB, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    last_synced_at = Column(DateTime, nullable=True)
