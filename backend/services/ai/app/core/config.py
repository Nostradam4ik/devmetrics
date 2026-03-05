from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "DevMetrics AI Service"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    DATABASE_URL: str = "postgresql+asyncpg://devmetrics:devmetrics123@localhost:5432/devmetrics"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Groq
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-70b-versatile"
    GROQ_MAX_TOKENS: int = 1500
    GROQ_TEMPERATURE: float = 0.7

    # CORS — override via env var (JSON array or comma-separated)
    # e.g. CORS_ORIGINS='["https://app.devmetrics.io"]'
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
