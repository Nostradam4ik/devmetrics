"""
DevMetrics Load Tests — Locust
==============================

Simulates realistic API traffic across Auth, Analytics, and AI services.

Usage:
  # Install: pip install locust
  # Web UI:  locust -f locustfile.py --host http://localhost
  # Headless: locust -f locustfile.py --host http://localhost -u 50 -r 5 --run-time 60s --headless

Environment variables:
  LOCUST_HOST       Base URL (default: http://localhost)
  LOCUST_ORG_ID     Organization ID to use in requests (default: demo-org)
  LOCUST_AUTH_TOKEN JWT token for authenticated endpoints (optional)
"""
import os
import random
from locust import HttpUser, task, between, events

ORG_ID = os.getenv("LOCUST_ORG_ID", "00000000-0000-0000-0000-000000000001")
AUTH_TOKEN = os.getenv("LOCUST_AUTH_TOKEN", "")

DEVELOPERS = [
    "00000000-0000-0000-0000-000000000010",
    "00000000-0000-0000-0000-000000000011",
    "00000000-0000-0000-0000-000000000012",
]


def auth_headers(token: str = AUTH_TOKEN) -> dict:
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {}


# ---------------------------------------------------------------------------
# Auth Service (port 8001 via nginx /auth)
# ---------------------------------------------------------------------------

class AuthUser(HttpUser):
    """Simulates a user hitting auth endpoints."""
    wait_time = between(1, 3)
    weight = 2

    @task(3)
    def health_check(self):
        self.client.get("/auth/health", name="/auth/health")

    @task(2)
    def get_current_user(self):
        self.client.get(
            "/auth/api/v1/users/me",
            headers=auth_headers(),
            name="/auth/api/v1/users/me",
        )

    @task(1)
    def list_integrations(self):
        self.client.get(
            f"/auth/api/v1/integrations/?organization_id={ORG_ID}",
            headers=auth_headers(),
            name="/auth/api/v1/integrations/",
        )


# ---------------------------------------------------------------------------
# Analytics Service (port 8003 via nginx /analytics)
# ---------------------------------------------------------------------------

class AnalyticsUser(HttpUser):
    """Simulates a dashboard user loading analytics data."""
    wait_time = between(0.5, 2)
    weight = 5

    @task(5)
    def team_metrics(self):
        self.client.get(
            f"/analytics/api/v1/metrics/team?organization_id={ORG_ID}",
            headers=auth_headers(),
            name="/analytics/api/v1/metrics/team",
        )

    @task(4)
    def summary_metrics(self):
        self.client.get(
            f"/analytics/api/v1/metrics/summary?organization_id={ORG_ID}",
            headers=auth_headers(),
            name="/analytics/api/v1/metrics/summary",
        )

    @task(3)
    def timeseries_commits(self):
        self.client.get(
            f"/analytics/api/v1/metrics/timeseries"
            f"?organization_id={ORG_ID}&metric_type=commits&granularity=day",
            headers=auth_headers(),
            name="/analytics/api/v1/metrics/timeseries[commits]",
        )

    @task(2)
    def timeseries_prs(self):
        self.client.get(
            f"/analytics/api/v1/metrics/timeseries"
            f"?organization_id={ORG_ID}&metric_type=prs&granularity=day",
            headers=auth_headers(),
            name="/analytics/api/v1/metrics/timeseries[prs]",
        )

    @task(3)
    def ml_velocity_trend(self):
        days = random.choice([14, 30, 60])
        self.client.get(
            f"/analytics/api/v1/ml/velocity-trend"
            f"?organization_id={ORG_ID}&metric=commits&days={days}",
            headers=auth_headers(),
            name="/analytics/api/v1/ml/velocity-trend",
        )

    @task(2)
    def ml_anomalies(self):
        self.client.get(
            f"/analytics/api/v1/ml/anomalies"
            f"?organization_id={ORG_ID}&method=combined&days=60",
            headers=auth_headers(),
            name="/analytics/api/v1/ml/anomalies",
        )

    @task(2)
    def ml_team_health(self):
        self.client.get(
            f"/analytics/api/v1/ml/team-health?organization_id={ORG_ID}",
            headers=auth_headers(),
            name="/analytics/api/v1/ml/team-health",
        )

    @task(1)
    def ml_sprint_prediction(self):
        self.client.get(
            f"/analytics/api/v1/ml/sprint-prediction"
            f"?organization_id={ORG_ID}&sprint_length_days=14&num_sprints=8",
            headers=auth_headers(),
            name="/analytics/api/v1/ml/sprint-prediction",
        )

    @task(1)
    def developer_score(self):
        dev_id = random.choice(DEVELOPERS)
        self.client.get(
            f"/analytics/api/v1/ml/developer-score/{dev_id}"
            f"?organization_id={ORG_ID}",
            headers=auth_headers(),
            name="/analytics/api/v1/ml/developer-score",
        )

    @task(1)
    def export_csv_team(self):
        self.client.get(
            f"/analytics/api/v1/exports/csv/team?organization_id={ORG_ID}",
            headers=auth_headers(),
            name="/analytics/api/v1/exports/csv/team",
        )

    @task(1)
    def export_templates(self):
        self.client.get(
            "/analytics/api/v1/exports/templates",
            headers=auth_headers(),
            name="/analytics/api/v1/exports/templates",
        )


# ---------------------------------------------------------------------------
# AI Service (port 8004 via nginx /ai)
# ---------------------------------------------------------------------------

class AIUser(HttpUser):
    """Simulates infrequent AI insight requests."""
    wait_time = between(3, 8)
    weight = 1

    @task(3)
    def health_check(self):
        self.client.get("/ai/health", name="/ai/health")

    @task(2)
    def list_insights(self):
        self.client.get(
            f"/ai/api/v1/insights/?organization_id={ORG_ID}&limit=10",
            headers=auth_headers(),
            name="/ai/api/v1/insights/",
        )

    @task(1)
    def get_suggestions(self):
        self.client.get(
            f"/ai/api/v1/insights/suggestions?organization_id={ORG_ID}",
            headers=auth_headers(),
            name="/ai/api/v1/insights/suggestions",
        )


# ---------------------------------------------------------------------------
# Event hooks — print summary thresholds
# ---------------------------------------------------------------------------

@events.quitting.add_listener
def check_thresholds(environment, **kwargs):
    """Fail the load test run if p95 > 2s or error rate > 5%."""
    stats = environment.runner.stats.total
    if stats.num_requests == 0:
        return
    error_rate = stats.num_failures / stats.num_requests * 100
    p95 = stats.get_response_time_percentile(0.95)

    print(f"\n[Load Test Summary]")
    print(f"  Total requests : {stats.num_requests}")
    print(f"  Failures       : {stats.num_failures} ({error_rate:.1f}%)")
    print(f"  p50 response   : {stats.get_response_time_percentile(0.50):.0f} ms")
    print(f"  p95 response   : {p95:.0f} ms")
    print(f"  p99 response   : {stats.get_response_time_percentile(0.99):.0f} ms")

    if error_rate > 5:
        print(f"  FAIL: error rate {error_rate:.1f}% > 5% threshold")
        environment.process_exit_code = 1
    elif p95 > 2000:
        print(f"  FAIL: p95 {p95:.0f}ms > 2000ms threshold")
        environment.process_exit_code = 1
    else:
        print("  PASS: All thresholds met.")
