"""
Redis pub/sub notification service for real-time events.
Publishes events to Redis channels and manages WebSocket connections.
"""
import json
import asyncio
import logging
from typing import Dict, Set, Optional, Any
from datetime import datetime

import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)

# Event type constants
class EventType:
    SYNC_STARTED = "sync_started"
    SYNC_COMPLETED = "sync_completed"
    SYNC_FAILED = "sync_failed"
    NEW_INSIGHT = "new_insight"
    NEW_COMMITS = "new_commits"
    PR_MERGED = "pr_merged"
    TEAM_MEMBER_JOINED = "team_member_joined"
    METRICS_UPDATED = "metrics_updated"
    PRESENCE_JOIN = "presence_join"
    PRESENCE_LEAVE = "presence_leave"


class ConnectionManager:
    """Manages WebSocket connections per organization."""

    def __init__(self):
        # org_id -> set of WebSocket connections
        self._connections: Dict[str, Set] = {}
        # user_id -> org_id (for presence tracking)
        self._user_presence: Dict[str, str] = {}

    def add_connection(self, org_id: str, websocket) -> None:
        if org_id not in self._connections:
            self._connections[org_id] = set()
        self._connections[org_id].add(websocket)

    def remove_connection(self, org_id: str, websocket) -> None:
        if org_id in self._connections:
            self._connections[org_id].discard(websocket)
            if not self._connections[org_id]:
                del self._connections[org_id]

    def track_presence(self, user_id: str, org_id: str) -> None:
        self._user_presence[user_id] = org_id

    def remove_presence(self, user_id: str) -> Optional[str]:
        return self._user_presence.pop(user_id, None)

    def get_online_users(self, org_id: str) -> list:
        """Return list of online user_ids for an org."""
        return [uid for uid, oid in self._user_presence.items() if oid == org_id]

    def connection_count(self, org_id: str) -> int:
        return len(self._connections.get(org_id, set()))

    async def broadcast_to_org(self, org_id: str, message: dict) -> int:
        """Send message to all connections in an org. Returns number of sent messages."""
        connections = self._connections.get(org_id, set()).copy()
        dead_connections = set()
        sent = 0

        for ws in connections:
            try:
                await ws.send_json(message)
                sent += 1
            except Exception:
                dead_connections.add(ws)

        # Clean up dead connections
        for ws in dead_connections:
            self.remove_connection(org_id, ws)

        return sent


# Singleton manager instance
manager = ConnectionManager()


class NotificationService:
    """Publishes events to Redis pub/sub channels."""

    CHANNEL_PREFIX = "devmetrics:events:"

    def __init__(self):
        self._redis: Optional[aioredis.Redis] = None

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
        return self._redis

    def _channel(self, org_id: str) -> str:
        return f"{self.CHANNEL_PREFIX}{org_id}"

    async def publish(self, org_id: str, event_type: str, data: dict) -> None:
        """Publish an event to the org's Redis channel."""
        try:
            redis = await self._get_redis()
            payload = {
                "type": event_type,
                "org_id": org_id,
                "data": data,
                "timestamp": datetime.utcnow().isoformat(),
            }
            await redis.publish(self._channel(org_id), json.dumps(payload))
        except Exception as e:
            logger.error(f"Failed to publish event {event_type} for org {org_id}: {e}")

    async def subscribe_and_forward(self, org_id: str) -> None:
        """
        Subscribe to org's Redis channel and forward messages
        to all connected WebSockets. Runs as a background task.
        """
        try:
            redis = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
            pubsub = redis.pubsub()
            await pubsub.subscribe(self._channel(org_id))

            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                try:
                    payload = json.loads(message["data"])
                    sent = await manager.broadcast_to_org(org_id, payload)
                    if sent == 0:
                        # No active connections — stop subscribing
                        break
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON from Redis channel: {message['data']}")
                except Exception as e:
                    logger.error(f"Error forwarding WebSocket message: {e}")

            await pubsub.unsubscribe(self._channel(org_id))
            await redis.aclose()
        except Exception as e:
            logger.error(f"Redis subscriber error for org {org_id}: {e}")

    # --- Convenience publishers ---

    async def notify_sync_started(self, org_id: str, repo_name: str) -> None:
        await self.publish(org_id, EventType.SYNC_STARTED, {"repo": repo_name})

    async def notify_sync_completed(
        self, org_id: str, repo_name: str, commits_added: int
    ) -> None:
        await self.publish(
            org_id,
            EventType.SYNC_COMPLETED,
            {"repo": repo_name, "commits_added": commits_added},
        )

    async def notify_sync_failed(self, org_id: str, repo_name: str, error: str) -> None:
        await self.publish(
            org_id, EventType.SYNC_FAILED, {"repo": repo_name, "error": error}
        )

    async def notify_new_insight(self, org_id: str, insight_id: str, title: str) -> None:
        await self.publish(
            org_id, EventType.NEW_INSIGHT, {"insight_id": insight_id, "title": title}
        )

    async def notify_metrics_updated(self, org_id: str) -> None:
        await self.publish(org_id, EventType.METRICS_UPDATED, {})

    async def close(self) -> None:
        if self._redis:
            await self._redis.aclose()
            self._redis = None


notification_service = NotificationService()
