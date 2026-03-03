# DevMetrics — Production Deployment Guide

## Prerequisites

- **Server**: Ubuntu 22.04 LTS, 4 vCPU / 8 GB RAM minimum (DigitalOcean Droplet, AWS EC2, GCP Compute, etc.)
- **Domain**: DNS A record pointing to your server IP
- **GitHub OAuth App**: Created at https://github.com/settings/developers
- **OpenAI API Key**: From https://platform.openai.com
- **Docker + Docker Compose v2** installed on the server

---

## 1. Server Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose v2 plugin
sudo apt-get install -y docker-compose-plugin

# Verify
docker compose version
```

## 2. Clone & Configure

```bash
git clone https://github.com/YOUR_ORG/devmetrics.git /opt/devmetrics
cd /opt/devmetrics

# Copy and fill in environment variables
cp .env.example .env
nano .env
```

### Required variables in `.env`

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_USER` | PostgreSQL user | `devmetrics` |
| `POSTGRES_PASSWORD` | Strong DB password | `s3cr3t_db_pass` |
| `POSTGRES_DB` | Database name | `devmetrics` |
| `SECRET_KEY` | JWT signing key (32+ chars) | `openssl rand -hex 32` |
| `REDIS_PASSWORD` | Redis auth password | `s3cr3t_redis` |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID | `Iv1.abc123` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret | `abc...xyz` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `NEXT_PUBLIC_AUTH_API_URL` | Public URL for auth API | `https://api.example.com` |
| `NEXT_PUBLIC_ANALYTICS_API_URL` | Public URL for analytics | `https://api.example.com` |
| `NEXT_PUBLIC_AI_API_URL` | Public URL for AI | `https://api.example.com` |

### Optional variables

| Variable | Description |
|----------|-------------|
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` | Slack OAuth integration |
| `JIRA_CLIENT_ID` / `JIRA_CLIENT_SECRET` | Jira OAuth integration |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | Email report delivery |
| `GRAFANA_PASSWORD` | Grafana admin password |

## 3. SSL Certificates

```bash
# Install Certbot
sudo apt-get install -y certbot

# Obtain certificate (replace with your domain)
sudo certbot certonly --standalone -d app.example.com

# Copy certs to the nginx ssl directory
sudo cp /etc/letsencrypt/live/app.example.com/fullchain.pem infrastructure/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/app.example.com/privkey.pem  infrastructure/nginx/ssl/key.pem

# Auto-renewal cron (runs twice daily)
echo "0 */12 * * * root certbot renew --quiet --deploy-hook 'docker compose -f /opt/devmetrics/docker-compose.yml exec -T nginx nginx -s reload'" | sudo tee /etc/cron.d/certbot-devmetrics
```

## 4. Deploy

```bash
cd /opt/devmetrics

# Build and start all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Monitor startup
docker compose logs -f --tail=50
```

The auth service entrypoint automatically:
1. Waits for PostgreSQL to be ready
2. Runs `alembic upgrade head`
3. Starts uvicorn

## 5. Create Demo Account (optional)

```bash
docker compose exec auth_service python /app/../../scripts/seed_demo.py
```

Demo credentials: `demo@devmetrics.io` / `Demo1234!`

## 6. Verify Health

```bash
# Quick health check script
for svc in auth ingestion analytics ai; do
  status=$(curl -s https://app.example.com/$svc/health | grep -o '"healthy"' | head -1)
  echo "$svc: ${status:-FAIL}"
done
```

Expected output:
```
auth: "healthy"
ingestion: "healthy"
analytics: "healthy"
ai: "healthy"
```

---

## Operations

### View logs

```bash
docker compose logs -f auth_service          # specific service
docker compose logs -f --since 1h            # last hour, all services
docker compose logs -f celery_worker         # Celery worker
```

### Scale Celery workers

```bash
docker compose up -d --scale celery_worker=3
```

### Run database migrations

```bash
docker compose exec auth_service alembic upgrade head
```

### Rollback a migration

```bash
docker compose exec auth_service alembic downgrade -1
```

### Backup PostgreSQL

```bash
docker compose exec postgres pg_dump -U devmetrics devmetrics | \
  gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Update to latest version

```bash
cd /opt/devmetrics
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker image prune -f
```

---

## Monitoring (Optional)

Start the monitoring stack:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  -f infrastructure/monitoring/docker-compose.monitoring.yml \
  up -d
```

| Service | URL | Credentials |
|---------|-----|-------------|
| Prometheus | http://server-ip:9090 | none |
| Grafana | http://server-ip:3001 | admin / `$GRAFANA_PASSWORD` |

---

## CI/CD (GitHub Actions)

The `deploy.yml` workflow automatically deploys on every push to `main`:

1. Runs all backend + frontend tests
2. Builds Docker images and pushes to GitHub Container Registry
3. SSH into the server and runs the deployment
4. Performs smoke tests against production

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DEPLOY_HOST` | Server IP or hostname |
| `DEPLOY_USER` | SSH user (e.g. `ubuntu`) |
| `DEPLOY_SSH_KEY` | Private SSH key (contents of `~/.ssh/id_rsa`) |
| `DEPLOY_PATH` | App directory (e.g. `/opt/devmetrics`) |
| `SLACK_DEPLOY_WEBHOOK` | (Optional) Slack webhook for deploy notifications |

### Required GitHub Variables

| Variable | Description |
|----------|-------------|
| `APP_URL` | Production URL for smoke tests (e.g. `https://app.example.com`) |

---

## Security Checklist

- [ ] All secrets are in `.env` (never committed to git)
- [ ] `.env` is in `.gitignore`
- [ ] `SECRET_KEY` is at least 32 random hex characters
- [ ] `POSTGRES_PASSWORD` and `REDIS_PASSWORD` are strong
- [ ] SSL certificate installed and HTTPS enforced
- [ ] GitHub OAuth redirect URIs updated to production domain
- [ ] Rate limiting active (configured in `nginx.prod.conf`)
- [ ] Firewall: only ports 80, 443, and 22 exposed publicly
- [ ] Server SSH access uses key authentication (no passwords)
- [ ] Regular automated DB backups configured

---

## Troubleshooting

### Service won't start
```bash
docker compose logs auth_service | tail -50
```

### Database migration fails
```bash
# Check current migration state
docker compose exec auth_service alembic current
# Force to a specific revision
docker compose exec auth_service alembic stamp head
```

### Port 443 already in use
```bash
sudo ss -tlnp | grep 443
sudo systemctl stop nginx  # if system nginx is running
```

### Out of disk space
```bash
docker system prune -a --volumes  # WARNING: removes all unused images/volumes
```
