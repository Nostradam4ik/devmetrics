from sqlalchemy import Column, String, Boolean, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Authentication
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)

    # Profile
    full_name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)

    # GitHub OAuth
    github_id = Column(Integer, unique=True, nullable=True, index=True)
    github_login = Column(String(255), nullable=True)
    github_access_token = Column(String(500), nullable=True)
    github_refresh_token = Column(String(500), nullable=True)
    github_token_expires_at = Column(DateTime, nullable=True)

    # Status flags
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    is_email_verified = Column(Boolean, default=False, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    last_login_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<User {self.email}>"

    def to_dict(self):
        return {
            "id": str(self.id),
            "email": self.email,
            "full_name": self.full_name,
            "avatar_url": self.avatar_url,
            "github_login": self.github_login,
            "is_active": self.is_active,
            "is_email_verified": self.is_email_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login_at": (
                self.last_login_at.isoformat() if self.last_login_at else None
            ),
        }
