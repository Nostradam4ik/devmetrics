#!/usr/bin/env python3
"""
Demo seed script — creates a demo organization, users, repositories,
and synthetic commit/PR data for showcasing DevMetrics.

Usage:
  # From repo root:
  cd backend/services/auth
  source venv/bin/activate
  python ../../scripts/seed_demo.py

  # Or with Docker:
  docker compose exec auth_service python /app/../../scripts/seed_demo.py

Environment variables (same as auth service):
  DATABASE_URL   — PostgreSQL async URL
  SECRET_KEY     — JWT secret
"""
import asyncio
import os
import sys
import uuid
import random
from datetime import datetime, timedelta
from pathlib import Path

# Add auth service to path so we can reuse its models/db
sys.path.insert(0, str(Path(__file__).parent.parent / "services" / "auth"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from passlib.context import CryptContext

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://devmetrics:devmetrics123@localhost:5432/devmetrics",
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---------------------------------------------------------------------------
# Demo data constants
# ---------------------------------------------------------------------------

DEMO_ORG_ID = "00000000-1234-1234-1234-000000000001"
DEMO_ORG_NAME = "Acme Corp (Demo)"
DEMO_ORG_SLUG = "acme-demo"

DEMO_USERS = [
    {
        "id": "00000000-1234-1234-1234-000000000010",
        "email": "demo@devmetrics.io",
        "full_name": "Demo User",
        "password": "Demo1234!",
        "github_login": "demo-user",
        "role": "admin",
    },
    {
        "id": "00000000-1234-1234-1234-000000000011",
        "email": "alice@acme-demo.com",
        "full_name": "Alice Chen",
        "password": "Demo1234!",
        "github_login": "alice-chen",
        "role": "member",
    },
    {
        "id": "00000000-1234-1234-1234-000000000012",
        "email": "bob@acme-demo.com",
        "full_name": "Bob Smith",
        "password": "Demo1234!",
        "github_login": "bob-smith",
        "role": "member",
    },
    {
        "id": "00000000-1234-1234-1234-000000000013",
        "email": "carol@acme-demo.com",
        "full_name": "Carol Diaz",
        "password": "Demo1234!",
        "github_login": "carol-diaz",
        "role": "member",
    },
]

DEMO_REPOS = [
    {
        "id": "00000000-1234-1234-1234-000000000020",
        "github_repo_id": 111000001,
        "name": "api-gateway",
        "full_name": "acme-demo/api-gateway",
        "language": "Python",
        "description": "Main API gateway service",
    },
    {
        "id": "00000000-1234-1234-1234-000000000021",
        "github_repo_id": 111000002,
        "name": "frontend-app",
        "full_name": "acme-demo/frontend-app",
        "language": "TypeScript",
        "description": "Next.js frontend application",
    },
    {
        "id": "00000000-1234-1234-1234-000000000022",
        "github_repo_id": 111000003,
        "name": "data-pipeline",
        "full_name": "acme-demo/data-pipeline",
        "language": "Python",
        "description": "ETL data pipeline",
    },
]


def _hash_password(password: str) -> str:
    return pwd_context.hash(password)


def _random_date(days_back: int = 90) -> datetime:
    offset = random.randint(0, days_back * 24 * 60 * 60)
    return datetime.utcnow() - timedelta(seconds=offset)


async def seed(db: AsyncSession):
    from sqlalchemy import text, insert
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    print("[seed] Creating demo organization...")
    await db.execute(text("""
        INSERT INTO organizations (id, name, slug, created_at, updated_at)
        VALUES (:id, :name, :slug, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
    """), {"id": DEMO_ORG_ID, "name": DEMO_ORG_NAME, "slug": DEMO_ORG_SLUG})

    print("[seed] Creating demo users...")
    for user in DEMO_USERS:
        await db.execute(text("""
            INSERT INTO users (id, email, full_name, hashed_password, github_login,
                               is_active, is_email_verified, created_at, updated_at)
            VALUES (:id, :email, :full_name, :hashed_password, :github_login,
                    true, true, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
        """), {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "hashed_password": _hash_password(user["password"]),
            "github_login": user["github_login"],
        })

    print("[seed] Creating organization members...")
    for user in DEMO_USERS:
        await db.execute(text("""
            INSERT INTO organization_members (id, organization_id, user_id, role, created_at, updated_at)
            VALUES (:id, :org_id, :user_id, :role, NOW(), NOW())
            ON CONFLICT DO NOTHING
        """), {
            "id": str(uuid.uuid4()),
            "org_id": DEMO_ORG_ID,
            "user_id": user["id"],
            "role": user["role"],
        })

    print("[seed] Creating demo repositories...")
    for repo in DEMO_REPOS:
        await db.execute(text("""
            INSERT INTO repositories (id, organization_id, github_repo_id, name, full_name,
                                      language, description, is_active, default_branch, created_at, updated_at)
            VALUES (:id, :org_id, :github_repo_id, :name, :full_name,
                    :language, :description, true, 'main', NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
        """), {
            "id": repo["id"],
            "org_id": DEMO_ORG_ID,
            **{k: v for k, v in repo.items() if k != "id"},
        })

    print("[seed] Creating demo developers...")
    developer_ids = {}
    for user in DEMO_USERS[1:]:  # skip demo admin
        dev_id = str(uuid.uuid4())
        developer_ids[user["github_login"]] = dev_id
        await db.execute(text("""
            INSERT INTO developers (id, organization_id, github_login, display_name, created_at, updated_at)
            VALUES (:id, :org_id, :github_login, :display_name, NOW(), NOW())
            ON CONFLICT DO NOTHING
        """), {
            "id": dev_id,
            "org_id": DEMO_ORG_ID,
            "github_login": user["github_login"],
            "display_name": user["full_name"],
        })

    print("[seed] Generating synthetic commits (90 days)...")
    commit_messages = [
        "feat: add user authentication",
        "fix: resolve memory leak in data pipeline",
        "refactor: extract common utilities",
        "docs: update API documentation",
        "test: add unit tests for user service",
        "feat: implement caching layer",
        "fix: handle edge case in date parsing",
        "chore: update dependencies",
        "feat: add export functionality",
        "fix: correct SQL query optimization",
        "refactor: simplify error handling",
        "feat: add webhook support",
    ]

    dev_logins = list(developer_ids.keys())
    for i in range(300):  # 300 commits over 90 days
        repo = random.choice(DEMO_REPOS)
        dev_login = random.choice(dev_logins)
        committed_at = _random_date(90)
        await db.execute(text("""
            INSERT INTO commits (id, repository_id, developer_id, sha, message,
                                 additions, deletions, files_changed, committed_at, created_at)
            VALUES (:id, :repo_id, :dev_id, :sha, :message,
                    :additions, :deletions, :files_changed, :committed_at, NOW())
            ON CONFLICT DO NOTHING
        """), {
            "id": str(uuid.uuid4()),
            "repo_id": repo["id"],
            "dev_id": developer_ids[dev_login],
            "sha": uuid.uuid4().hex[:40],
            "message": random.choice(commit_messages),
            "additions": random.randint(5, 500),
            "deletions": random.randint(0, 200),
            "files_changed": random.randint(1, 15),
            "committed_at": committed_at,
        })

    print("[seed] Generating synthetic pull requests...")
    pr_titles = [
        "Add user dashboard",
        "Fix authentication bug",
        "Refactor database layer",
        "Add ML analytics endpoint",
        "Improve test coverage",
        "Update CI pipeline",
        "Add Slack integration",
        "Performance improvements",
    ]
    states = ["merged", "merged", "merged", "open", "closed"]

    for i in range(60):
        repo = random.choice(DEMO_REPOS)
        dev_login = random.choice(dev_logins)
        created_at = _random_date(90)
        state = random.choice(states)
        cycle_hours = random.uniform(2, 72) if state == "merged" else None
        merged_at = (created_at + timedelta(hours=cycle_hours)) if state == "merged" and cycle_hours else None

        await db.execute(text("""
            INSERT INTO pull_requests (id, repository_id, developer_id, github_pr_number,
                                       title, state, additions, deletions,
                                       cycle_time_hours, merged_at, created_at, updated_at)
            VALUES (:id, :repo_id, :dev_id, :pr_number, :title, :state,
                    :additions, :deletions, :cycle_hours, :merged_at, :created_at, NOW())
            ON CONFLICT DO NOTHING
        """), {
            "id": str(uuid.uuid4()),
            "repo_id": repo["id"],
            "dev_id": developer_ids[dev_login],
            "pr_number": i + 1,
            "title": random.choice(pr_titles),
            "state": state,
            "additions": random.randint(10, 800),
            "deletions": random.randint(0, 300),
            "cycle_hours": round(cycle_hours, 2) if cycle_hours else None,
            "merged_at": merged_at,
            "created_at": created_at,
        })

    await db.commit()
    print("\n[seed] ✅ Demo data created successfully!")
    print(f"  Organization : {DEMO_ORG_NAME}")
    print(f"  Org ID       : {DEMO_ORG_ID}")
    print(f"  Admin login  : demo@devmetrics.io / Demo1234!")
    print(f"  Users        : {len(DEMO_USERS)}")
    print(f"  Repositories : {len(DEMO_REPOS)}")
    print(f"  Commits      : ~300 (90 days)")
    print(f"  Pull requests: ~60 (90 days)")


async def main():
    engine = create_async_engine(DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with session_factory() as session:
            await seed(session)
    except Exception as e:
        print(f"\n[seed] ERROR: {e}")
        print("[seed] Make sure the DB is running and migrations have been applied.")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
