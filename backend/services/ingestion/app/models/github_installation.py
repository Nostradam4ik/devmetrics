from sqlalchemy import Column, String, Integer, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
from app.core.database import Base


class GitHubInstallation(Base):
    __tablename__ = "github_installations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=False)
    installation_id = Column(Integer, unique=True, nullable=False)
    access_token = Column(String, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    repositories_access = Column(JSONB, nullable=True)
    webhook_secret = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    def __repr__(self):
        return f"<GitHubInstallation {self.installation_id}>"
