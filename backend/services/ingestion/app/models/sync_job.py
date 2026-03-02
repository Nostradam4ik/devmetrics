from sqlalchemy import Column, String, Integer, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.core.database import Base


class SyncJob(Base):
    __tablename__ = "sync_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    repository_id = Column(UUID(as_uuid=True), nullable=True)

    # Job Info
    job_type = Column(String(100), nullable=True)
    status = Column(String(50), nullable=True, index=True)

    # Stats
    items_processed = Column(Integer, default=0)
    items_failed = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)

    # Timestamps
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    def __repr__(self):
        return f"<SyncJob {self.job_type} - {self.status}>"
