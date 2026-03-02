from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
from app.core.database import Base


class Insight(Base):
    __tablename__ = "insights"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Insight Data
    type = Column(String(100), nullable=False, index=True)
    title = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)

    # Metadata
    severity = Column(String(50), nullable=True)
    category = Column(String(100), nullable=True)
    metadata_ = Column("metadata", JSONB, nullable=True)

    # AI Info
    model_used = Column(String(100), nullable=True)
    tokens_used = Column(Integer, nullable=True)

    # Status
    is_read = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)

    # Timestamps
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Insight {self.type}: {self.title[:50]}>"
