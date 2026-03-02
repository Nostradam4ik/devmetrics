from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "devmetrics_ingestion",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.github_sync"],
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
)

# Periodic tasks schedule
celery_app.conf.beat_schedule = {
    "sync-all-repositories": {
        "task": "app.workers.github_sync.sync_all_repositories",
        "schedule": settings.SYNC_INTERVAL_MINUTES * 60.0,
    },
}
