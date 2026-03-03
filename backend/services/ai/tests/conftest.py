import pytest
import asyncio
from typing import Generator, AsyncGenerator
from unittest.mock import AsyncMock, patch
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
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def mock_openai():
    """Mock OpenAI service to avoid real API calls in tests."""
    with patch("app.services.openai_service.openai_service") as mock:
        mock.generate_insights = AsyncMock(return_value={
            "summary": "Team is performing well with 245 commits this week.",
            "model_used": "gpt-4-turbo-preview",
            "generated_at": "2024-01-01T00:00:00",
        })
        mock.generate_weekly_report = AsyncMock(
            return_value="## Weekly Report\n\nTeam velocity is up 12% this week."
        )
        mock.answer_query = AsyncMock(
            return_value="Based on the data, your team has a strong commit cadence."
        )
        mock.generate_completion = AsyncMock(
            return_value='[{"title": "Reduce PR size", "description": "Keep PRs small", "priority": "high", "category": "process"}]'
        )
        mock.model = "gpt-4-turbo-preview"
        yield mock
