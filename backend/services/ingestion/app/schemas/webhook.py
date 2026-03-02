from pydantic import BaseModel
from typing import Optional, Dict, Any


class GitHubWebhookPayload(BaseModel):
    action: Optional[str] = None
    repository: Optional[Dict[str, Any]] = None
    sender: Optional[Dict[str, Any]] = None


class GitHubPushEvent(GitHubWebhookPayload):
    ref: Optional[str] = None
    before: Optional[str] = None
    after: Optional[str] = None
    commits: Optional[list] = None


class GitHubPullRequestEvent(GitHubWebhookPayload):
    number: Optional[int] = None
    pull_request: Optional[Dict[str, Any]] = None


class WebhookResponse(BaseModel):
    status: str
    message: str
