from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "DevMetrics Ingestion Service"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    DATABASE_URL: str = "postgresql+asyncpg://devmetrics:devmetrics123@localhost:5432/devmetrics"
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # CORS — override via env var (JSON array or comma-separated)
    # e.g. CORS_ORIGINS='["https://app.devmetrics.io"]'
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    GITHUB_API_URL: str = "https://api.github.com"
    GITHUB_GRAPHQL_URL: str = "https://api.github.com/graphql"

    SYNC_INTERVAL_MINUTES: int = 15
    FULL_SYNC_DAYS: int = 7
    MAX_COMMITS_PER_SYNC: int = 1000

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
