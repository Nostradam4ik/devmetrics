import redis.asyncio as redis
import json
from typing import Optional, Any
from app.core.config import settings


class CacheService:
    """Redis cache service."""

    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        self.enabled = settings.ENABLE_CACHE

    async def connect(self):
        """Connect to Redis."""
        if self.enabled:
            self.redis = await redis.from_url(
                settings.REDIS_URL, decode_responses=True
            )

    async def disconnect(self):
        """Disconnect from Redis."""
        if self.redis:
            await self.redis.close()

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if not self.enabled or not self.redis:
            return None

        try:
            value = await self.redis.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            print(f"Cache get error: {e}")
        return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """Set value in cache."""
        if not self.enabled or not self.redis:
            return

        try:
            serialized = json.dumps(value)
            await self.redis.set(
                key, serialized, ex=ttl or settings.CACHE_TTL_SECONDS
            )
        except Exception as e:
            print(f"Cache set error: {e}")

    async def delete(self, key: str):
        """Delete key from cache."""
        if not self.enabled or not self.redis:
            return

        try:
            await self.redis.delete(key)
        except Exception as e:
            print(f"Cache delete error: {e}")

    async def clear_pattern(self, pattern: str):
        """Clear all keys matching pattern."""
        if not self.enabled or not self.redis:
            return

        try:
            keys = await self.redis.keys(pattern)
            if keys:
                await self.redis.delete(*keys)
        except Exception as e:
            print(f"Cache clear error: {e}")


cache_service = CacheService()
