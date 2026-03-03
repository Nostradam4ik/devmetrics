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

    # SMTP (for scheduled email reports)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_TLS: bool = False
    SMTP_STARTTLS: bool = True
    FROM_EMAIL: str = "noreply@devmetrics.io"
    FROM_NAME: str = "DevMetrics"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
