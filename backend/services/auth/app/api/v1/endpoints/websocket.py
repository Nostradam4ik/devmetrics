"""
WebSocket endpoint for real-time notifications.
Clients authenticate with a JWT token via query param, then receive
org-scoped events pushed from Redis pub/sub.
"""
import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from jose import JWTError, jwt

from app.core.config import settings
from app.services.notification_service import (
    manager,
    notification_service,
    EventType,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _decode_token(token: str) -> Optional[dict]:
    """Return JWT payload or None if invalid."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
    org_id: str = Query(..., description="Organization ID to subscribe to"),
):
    """
    WebSocket connection for real-time notifications.

    Query params:
    - token: JWT access token
    - org_id: Organization ID

    Messages sent by server:
    - { type: "connected", data: { user_id, org_id, online_users } }
    - { type: "sync_started"|"sync_completed"|..., data: {...}, timestamp }
    - { type: "presence_join"|"presence_leave", data: { user_id } }
    - { type: "ping" }  (keepalive every 30s)
    """
    # --- Auth ---
    payload = _decode_token(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id: str = payload.get("sub", "")
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()

    # Register connection
    manager.add_connection(org_id, websocket)
    manager.track_presence(user_id, org_id)

    # Notify others that user joined
    online_users = manager.get_online_users(org_id)
    await manager.broadcast_to_org(
        org_id,
        {
            "type": EventType.PRESENCE_JOIN,
            "data": {"user_id": user_id, "online_users": online_users},
        },
    )

    # Send welcome message to this client
    await websocket.send_json(
        {
            "type": "connected",
            "data": {
                "user_id": user_id,
                "org_id": org_id,
                "online_users": online_users,
            },
        }
    )

    # Start Redis subscriber background task for this org (idempotent: if already
    # running for the org it will reuse the existing broadcast)
    subscriber_task = asyncio.create_task(
        notification_service.subscribe_and_forward(org_id)
    )

    # Keepalive ping task
    async def send_pings():
        while True:
            await asyncio.sleep(30)
            try:
                await websocket.send_json({"type": "ping"})
            except Exception:
                break

    ping_task = asyncio.create_task(send_pings())

    try:
        # Keep connection open; handle incoming pong/messages from client
        async for raw_message in websocket.iter_text():
            try:
                msg = json.loads(raw_message)
                if msg.get("type") == "pong":
                    pass  # keepalive acknowledged
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        pass
    finally:
        ping_task.cancel()
        subscriber_task.cancel()

        manager.remove_connection(org_id, websocket)
        manager.remove_presence(user_id)

        # Notify remaining members
        remaining = manager.get_online_users(org_id)
        if manager.connection_count(org_id) > 0:
            await manager.broadcast_to_org(
                org_id,
                {
                    "type": EventType.PRESENCE_LEAVE,
                    "data": {"user_id": user_id, "online_users": remaining},
                },
            )

        logger.info(f"WebSocket disconnected: user={user_id}, org={org_id}")
