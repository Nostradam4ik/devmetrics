from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from datetime import datetime
import uuid
from app.core.database import Base


class Commit(Base):
    __tablename__ = "commits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repository_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    developer_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    sha = Column(String(40), unique=True, nullable=False, index=True)
    message = Column(Text, nullable=True)
    author_name = Column(String(255), nullable=True)
    author_email = Column(String(255), nullable=True)

    additions = Column(Integer, default=0)
    deletions = Column(Integer, default=0)
    files_changed = Column(Integer, default=0)

    branch = Column(String(255), nullable=True)
    is_merge_commit = Column(Boolean, default=False)
    parent_shas = Column(ARRAY(Text), nullable=True)

    committed_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
