import httpx
from typing import Dict, List, Optional
from datetime import datetime
from app.core.config import settings


class GitHubClient:
    """Client for GitHub GraphQL API."""

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

    async def execute_query(
        self, query: str, variables: Optional[Dict] = None
    ) -> Dict:
        """Execute GraphQL query."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.GITHUB_GRAPHQL_URL,
                json={"query": query, "variables": variables or {}},
                headers=self.headers,
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

            if "errors" in data:
                raise Exception(f"GraphQL errors: {data['errors']}")

            return data.get("data", {})

    async def get_repository(self, owner: str, name: str) -> Dict:
        """Get repository information."""
        query = """
        query($owner: String!, $name: String!) {
          repository(owner: $owner, name: $name) {
            id
            databaseId
            name
            nameWithOwner
            description
            url
            defaultBranchRef {
              name
            }
            isPrivate
            primaryLanguage {
              name
            }
            repositoryTopics(first: 10) {
              nodes {
                topic {
                  name
                }
              }
            }
            createdAt
            updatedAt
          }
        }
        """
        data = await self.execute_query(query, {"owner": owner, "name": name})
        return data.get("repository", {})

    async def get_commits(
        self,
        owner: str,
        name: str,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
        cursor: Optional[str] = None,
        limit: int = 100,
    ) -> Dict:
        """Get commits from repository."""
        query = """
        query($owner: String!, $name: String!, $since: GitTimestamp, $until: GitTimestamp, $cursor: String, $limit: Int!) {
          repository(owner: $owner, name: $name) {
            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: $limit, after: $cursor, since: $since, until: $until) {
                    pageInfo {
                      hasNextPage
                      endCursor
                    }
                    nodes {
                      oid
                      message
                      committedDate
                      author {
                        name
                        email
                        user {
                          login
                          databaseId
                          avatarUrl
                        }
                      }
                      additions
                      deletions
                      changedFiles
                    }
                  }
                }
              }
            }
          }
        }
        """
        variables: Dict = {
            "owner": owner,
            "name": name,
            "limit": limit,
            "cursor": cursor,
        }

        if since:
            variables["since"] = since.isoformat()
        if until:
            variables["until"] = until.isoformat()

        data = await self.execute_query(query, variables)
        repo = data.get("repository", {})
        ref = repo.get("defaultBranchRef", {})
        target = ref.get("target", {})
        return target.get("history", {})

    async def get_pull_requests(
        self,
        owner: str,
        name: str,
        states: Optional[List[str]] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> Dict:
        """Get pull requests from repository."""
        if states is None:
            states = ["OPEN", "CLOSED", "MERGED"]

        query = """
        query($owner: String!, $name: String!, $states: [PullRequestState!], $cursor: String, $limit: Int!) {
          repository(owner: $owner, name: $name) {
            pullRequests(first: $limit, after: $cursor, states: $states, orderBy: {field: UPDATED_AT, direction: DESC}) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                databaseId
                number
                title
                body
                state
                createdAt
                updatedAt
                mergedAt
                closedAt
                headRefName
                baseRefName
                author {
                  login
                  ... on User {
                    databaseId
                    avatarUrl
                    name
                  }
                }
                additions
                deletions
                changedFiles
                commits {
                  totalCount
                }
                comments {
                  totalCount
                }
                labels(first: 10) {
                  nodes {
                    name
                  }
                }
                reviews(first: 1) {
                  nodes {
                    createdAt
                  }
                }
              }
            }
          }
        }
        """
        data = await self.execute_query(
            query,
            {
                "owner": owner,
                "name": name,
                "states": states,
                "cursor": cursor,
                "limit": limit,
            },
        )
        repo = data.get("repository", {})
        return repo.get("pullRequests", {})

    async def get_pr_reviews(
        self, owner: str, name: str, pr_number: int
    ) -> List[Dict]:
        """Get reviews for a specific pull request."""
        query = """
        query($owner: String!, $name: String!, $prNumber: Int!) {
          repository(owner: $owner, name: $name) {
            pullRequest(number: $prNumber) {
              reviews(first: 100) {
                nodes {
                  databaseId
                  state
                  body
                  submittedAt
                  author {
                    login
                    ... on User {
                      databaseId
                      avatarUrl
                      name
                    }
                  }
                }
              }
            }
          }
        }
        """
        data = await self.execute_query(
            query, {"owner": owner, "name": name, "prNumber": pr_number}
        )
        repo = data.get("repository", {})
        pr = repo.get("pullRequest", {})
        reviews = pr.get("reviews", {})
        return reviews.get("nodes", [])
