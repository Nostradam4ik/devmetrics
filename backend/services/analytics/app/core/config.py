from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "DevMetrics Analytics Service"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    DATABASE_URL: str = "postgresql+asyncpg://devmetrics:devmetrics123@localhost:5432/devmetrics"
    REDIS_URL: str = "redis://localhost:6379/0"

    CACHE_TTL_SECONDS: int = 300
    ENABLE_CACHE: bool = True

    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
