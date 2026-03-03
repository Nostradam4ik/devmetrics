"""
Slack integration service.

Handles:
1. OAuth flow (Step 1: redirect URL, Step 2: exchange code → tokens)
2. Incoming Webhook: send notifications to a Slack channel
3. Message templates for DevMetrics events
"""
import json
import logging
from typing import Optional
from urllib.parse import urlencode

import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

SLACK_OAUTH_URL = "https://slack.com/oauth/v2/authorize"
SLACK_TOKEN_URL = "https://api.slack.com/api/oauth.v2.access"
SLACK_POST_URL = "https://slack.com/api/chat.postMessage"
SLACK_WEBHOOK_TEST = "https://hooks.slack.com/"

# Required scopes for DevMetrics bot
SLACK_SCOPES = "incoming-webhook,chat:write,chat:write.public"


class SlackService:
    """Handles Slack OAuth and message delivery."""

    # ------------------------------------------------------------------
    # OAuth
    # ------------------------------------------------------------------

    @staticmethod
    def get_oauth_url(org_id: str, redirect_uri: str) -> str:
        """Build the Slack OAuth authorization URL."""
        params = {
            "client_id": settings.SLACK_CLIENT_ID,
            "scope": SLACK_SCOPES,
            "redirect_uri": redirect_uri,
            "state": org_id,  # We use org_id as state for CSRF protection
            "user_scope": "",
        }
        return f"{SLACK_OAUTH_URL}?{urlencode(params)}"

    @staticmethod
    async def exchange_code(code: str, redirect_uri: str) -> dict:
        """Exchange OAuth code for access token + webhook URL."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                SLACK_TOKEN_URL,
                data={
                    "client_id": settings.SLACK_CLIENT_ID,
                    "client_secret": settings.SLACK_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
                headers={"Accept": "application/json"},
            )
            resp.raise_for_status()
            data = resp.json()

        if not data.get("ok"):
            raise ValueError(f"Slack OAuth error: {data.get('error', 'unknown')}")

        incoming_webhook = data.get("incoming_webhook", {})
        team = data.get("team", {})

        return {
            "access_token": data.get("access_token"),
            "team_id": team.get("id"),
            "team_name": team.get("name"),
            "webhook_url": incoming_webhook.get("url"),
            "channel_id": incoming_webhook.get("channel_id"),
            "channel_name": incoming_webhook.get("channel"),
        }

    # ------------------------------------------------------------------
    # Message delivery
    # ------------------------------------------------------------------

    @staticmethod
    async def send_webhook(webhook_url: str, payload: dict) -> bool:
        """POST a message payload to a Slack Incoming Webhook URL."""
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    webhook_url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=10,
                )
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"Slack webhook delivery failed: {e}")
            return False

    @staticmethod
    async def test_webhook(webhook_url: str, channel_name: str) -> bool:
        """Send a test message to verify the webhook is working."""
        payload = SlackService.build_test_message(channel_name)
        return await SlackService.send_webhook(webhook_url, payload)

    # ------------------------------------------------------------------
    # Message templates
    # ------------------------------------------------------------------

    @staticmethod
    def build_test_message(channel: str) -> dict:
        return {
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": ":white_check_mark: *DevMetrics is connected!*\nNotifications for `#{}` are now active.".format(channel),
                    },
                }
            ]
        }

    @staticmethod
    def build_sync_completed_message(repo_name: str, commits_added: int) -> dict:
        return {
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f":arrows_counterclockwise: *Sync Complete* — `{repo_name}`\n{commits_added} new commits imported.",
                    },
                }
            ]
        }

    @staticmethod
    def build_sync_failed_message(repo_name: str, error: str) -> dict:
        return {
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f":x: *Sync Failed* — `{repo_name}`\nError: {error[:200]}",
                    },
                }
            ]
        }

    @staticmethod
    def build_new_insight_message(title: str, summary: str) -> dict:
        return {
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f":bulb: *New AI Insight*\n*{title}*\n{summary[:300]}",
                    },
                }
            ]
        }

    @staticmethod
    def build_weekly_report_message(
        total_commits: int,
        active_devs: int,
        merge_rate: float,
        avg_cycle_time: float,
        period: str,
        dashboard_url: str = "https://app.devmetrics.io",
    ) -> dict:
        return {
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": f"📊 DevMetrics Weekly Report — {period}",
                    },
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*Commits*\n{total_commits:,}"},
                        {"type": "mrkdwn", "text": f"*Active Devs*\n{active_devs}"},
                        {"type": "mrkdwn", "text": f"*Merge Rate*\n{merge_rate}%"},
                        {"type": "mrkdwn", "text": f"*Avg Cycle Time*\n{avg_cycle_time}h"},
                    ],
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {"type": "plain_text", "text": "View Dashboard"},
                            "url": dashboard_url,
                            "style": "primary",
                        }
                    ],
                },
            ]
        }


slack_service = SlackService()
