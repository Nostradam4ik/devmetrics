from sqlalchemy import Column, String, Integer, DateTime, Boolean, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.core.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)

    # GitHub Integration
    github_org_id = Column(Integer, unique=True, nullable=True)
    github_org_name = Column(String(255), nullable=True)
    github_installation_id = Column(Integer, nullable=True)

    # Subscription
    plan = Column(String(50), default="free", nullable=False)
    max_users = Column(Integer, default=5, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    def __repr__(self):
        return f"<Organization {self.name}>"


class OrganizationMember(Base):
    __tablename__ = "organization_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    role = Column(String(50), default="member", nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_org_member"),
    )

    def __repr__(self):
        return f"<OrganizationMember {self.user_id} in {self.organization_id}>"
