import pytest
import asyncio
from typing import Generator, AsyncGenerator
from unittest.mock import MagicMock, patch
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import Base, get_db

TEST_DATABASE_URL = "postgresql+asyncpg://devmetrics:devmetrics123@localhost:5432/devmetrics_test"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """HTTP client with DB override and mocked Celery tasks."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # Mock Celery so sync tasks don't run during tests
    with patch("app.workers.github_sync.sync_repository") as mock_task:
        mock_task.delay = MagicMock(return_value=None)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def sample_repo_payload():
    return {
        "github_repo_id": 123456789,
        "name": "my-service",
        "full_name": "acme/my-service",
        "description": "A test repository",
        "default_branch": "main",
        "is_private": False,
        "language": "Python",
        "github_access_token": "ghp_test_token_xyz",
    }
