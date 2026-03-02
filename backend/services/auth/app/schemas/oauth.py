from pydantic import BaseModel
from typing import Optional


class GitHubAuthURL(BaseModel):
    auth_url: str


class GitHubCallback(BaseModel):
    code: str
    state: Optional[str] = None


class GitHubUserInfo(BaseModel):
    login: str
    id: int
    avatar_url: str
    name: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
