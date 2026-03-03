"""
Jira Cloud integration service.

Handles:
1. OAuth 2.0 (3-legged) flow for Jira Cloud
2. Fetching accessible resources (sites)
3. Issues/sprint data retrieval for correlation with code metrics
"""
import logging
from typing import Optional, List, Dict
from urllib.parse import urlencode

import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

JIRA_AUTH_URL = "https://auth.atlassian.com/authorize"
JIRA_TOKEN_URL = "https://auth.atlassian.com/oauth/token"
JIRA_RESOURCES_URL = "https://api.atlassian.com/oauth/token/accessible-resources"
JIRA_API_BASE = "https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3"

JIRA_SCOPES = " ".join([
    "read:jira-work",
    "read:jira-user",
    "offline_access",
])


class JiraService:
    """Handles Jira Cloud OAuth and data retrieval."""

    # ------------------------------------------------------------------
    # OAuth
    # ------------------------------------------------------------------

    @staticmethod
    def get_oauth_url(org_id: str, redirect_uri: str) -> str:
        """Build the Jira OAuth 2.0 authorization URL."""
        params = {
            "audience": "api.atlassian.com",
            "client_id": settings.JIRA_CLIENT_ID,
            "scope": JIRA_SCOPES,
            "redirect_uri": redirect_uri,
            "state": org_id,
            "response_type": "code",
            "prompt": "consent",
        }
        return f"{JIRA_AUTH_URL}?{urlencode(params)}"

    @staticmethod
    async def exchange_code(code: str, redirect_uri: str) -> dict:
        """Exchange OAuth code for access + refresh tokens."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                JIRA_TOKEN_URL,
                json={
                    "grant_type": "authorization_code",
                    "client_id": settings.JIRA_CLIENT_ID,
                    "client_secret": settings.JIRA_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            return resp.json()

    @staticmethod
    async def refresh_access_token(refresh_token: str) -> dict:
        """Refresh an expired Jira access token."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                JIRA_TOKEN_URL,
                json={
                    "grant_type": "refresh_token",
                    "client_id": settings.JIRA_CLIENT_ID,
                    "client_secret": settings.JIRA_CLIENT_SECRET,
                    "refresh_token": refresh_token,
                },
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            return resp.json()

    # ------------------------------------------------------------------
    # Resources
    # ------------------------------------------------------------------

    @staticmethod
    async def get_accessible_resources(access_token: str) -> List[Dict]:
        """Return list of Jira Cloud sites the token can access."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                JIRA_RESOURCES_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            return resp.json()

    # ------------------------------------------------------------------
    # Projects & Sprints
    # ------------------------------------------------------------------

    @staticmethod
    async def get_projects(access_token: str, cloud_id: str) -> List[Dict]:
        """Fetch all projects from a Jira Cloud site."""
        url = f"{JIRA_API_BASE.format(cloud_id=cloud_id)}/project/search"
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                url,
                params={"maxResults": 50, "expand": "description"},
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()
        return [
            {
                "id": p["id"],
                "key": p["key"],
                "name": p["name"],
                "type": p.get("projectTypeKey", "software"),
            }
            for p in data.get("values", [])
        ]

    @staticmethod
    async def get_sprint_issues(
        access_token: str,
        cloud_id: str,
        project_key: str,
        sprint_name: Optional[str] = None,
    ) -> Dict:
        """Fetch issues for the active or named sprint of a project."""
        jql = f'project = "{project_key}" AND sprint in openSprints()'
        if sprint_name:
            jql = f'project = "{project_key}" AND sprint = "{sprint_name}"'

        url = f"{JIRA_API_BASE.format(cloud_id=cloud_id)}/search"
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                url,
                params={
                    "jql": jql,
                    "maxResults": 100,
                    "fields": "summary,status,assignee,priority,issuetype,story_points",
                },
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()

        issues = data.get("issues", [])
        total = data.get("total", 0)

        # Summarize by status
        status_counts: Dict[str, int] = {}
        for issue in issues:
            status = issue["fields"]["status"]["name"]
            status_counts[status] = status_counts.get(status, 0) + 1

        return {
            "total": total,
            "issues": [
                {
                    "key": i["key"],
                    "summary": i["fields"]["summary"],
                    "status": i["fields"]["status"]["name"],
                    "assignee": (i["fields"].get("assignee") or {}).get("displayName"),
                    "type": i["fields"]["issuetype"]["name"],
                }
                for i in issues[:20]  # first 20 for preview
            ],
            "status_summary": status_counts,
        }

    @staticmethod
    async def get_issue_metrics(
        access_token: str,
        cloud_id: str,
        project_key: str,
        days: int = 30,
    ) -> Dict:
        """Get aggregated issue metrics for the past N days."""
        jql = (
            f'project = "{project_key}" AND created >= "-{days}d" '
            f'ORDER BY created DESC'
        )
        url = f"{JIRA_API_BASE.format(cloud_id=cloud_id)}/search"

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                url,
                params={
                    "jql": jql,
                    "maxResults": 200,
                    "fields": "summary,status,issuetype,resolutiondate,created",
                },
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()

        issues = data.get("issues", [])
        resolved = [i for i in issues if i["fields"].get("resolutiondate")]
        issue_types: Dict[str, int] = {}
        status_counts: Dict[str, int] = {}

        for issue in issues:
            itype = issue["fields"]["issuetype"]["name"]
            issue_types[itype] = issue_types.get(itype, 0) + 1
            status = issue["fields"]["status"]["name"]
            status_counts[status] = status_counts.get(status, 0) + 1

        return {
            "total_issues": len(issues),
            "resolved": len(resolved),
            "resolution_rate": round(len(resolved) / len(issues) * 100, 1) if issues else 0,
            "by_type": issue_types,
            "by_status": status_counts,
            "period_days": days,
        }


jira_service = JiraService()
