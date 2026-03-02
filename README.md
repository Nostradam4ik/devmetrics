# DevMetrics

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 20+](https://img.shields.io/badge/node-20+-green.svg)](https://nodejs.org/)

> AI-Powered Developer Analytics Platform to track team productivity, analyze code metrics, and get actionable insights.

**Author:** Andrii Zhmuryk ([@andrijzmurik](mailto:andrijzmurik@gmail.com))

## Features

- **Secure Authentication** - JWT + GitHub OAuth
- **Real-time Metrics** - Commits, PRs, code reviews tracking
- **AI Insights** - GPT-4 powered recommendations
- **Team Dashboard** - Beautiful analytics interface
- **Auto Sync** - Automatic GitHub data collection with Celery
- **Modern UI** - Next.js 15 + Tailwind CSS + shadcn/ui

## Architecture

```
DevMetrics (Microservices)
│
├── Auth Service (Port 8001)
│   └── JWT authentication + GitHub OAuth
│
├── Ingestion Service (Port 8002)
│   ├── GitHub GraphQL API client
│   └── Celery workers (auto sync every 15min)
│
├── Analytics Service (Port 8003)
│   ├── Metrics calculator
│   └── Redis caching
│
├── AI Service (Port 8004)
│   └── OpenAI GPT-4 insights
│
└── Frontend (Port 3000)
    └── Next.js 15 React app
```

## Tech Stack

**Backend:**
- FastAPI (Python 3.11+)
- PostgreSQL 16 (Database)
- Redis 7 (Cache + Message Broker)
- Celery + Beat (Background jobs)
- SQLAlchemy (async ORM)
- OpenAI API (GPT-4)

**Frontend:**
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- TanStack Query
- Recharts (charts)
- shadcn/ui (components)

**Infrastructure:**
- Docker & Docker Compose
- Nginx (reverse proxy)
- GitHub Actions (CI/CD)

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.11+
- Node.js 20+
- GitHub account (for OAuth)
- OpenAI API key (optional, for AI features)

### 1. Clone & Setup

```bash
git clone https://github.com/AndriiZhmuryk/devmetrics.git
cd devmetrics

# Copy environment template
cp .env.example .env
# Edit .env with your secrets (GitHub OAuth, OpenAI key, etc.)
```

### 2. Run with Docker

```bash
docker-compose up -d
```

### 3. Or run services individually

```bash
# Start infrastructure
docker-compose up -d postgres redis

# Auth Service
cd backend/services/auth
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

# Frontend
cd frontend
npm install
npm run dev
```

## Services

| Service    | Port | Description                    |
|------------|------|--------------------------------|
| Frontend   | 3000 | Next.js web application        |
| Auth       | 8001 | Authentication & user mgmt     |
| Ingestion  | 8002 | GitHub data collection          |
| Analytics  | 8003 | Metrics calculation & queries   |
| AI         | 8004 | GPT-4 insights generation       |
| PostgreSQL | 5432 | Primary database               |
| Redis      | 6379 | Cache & message broker         |

## Project Structure

```
devmetrics/
├── frontend/              # Next.js 15 App
│   ├── app/               # App Router pages
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks
│   └── lib/               # API clients & utilities
├── backend/
│   ├── shared/            # Shared code (models, utils)
│   └── services/
│       ├── auth/          # Auth microservice
│       ├── ingestion/     # Data collection + Celery
│       ├── analytics/     # Metrics engine + Redis cache
│       └── ai/            # AI insights
├── infrastructure/        # Docker, Nginx configs
├── docker-compose.yml     # Orchestration
└── .github/workflows/     # CI/CD pipelines
```

## License

MIT License - Copyright (c) 2026 Andrii Zhmuryk
