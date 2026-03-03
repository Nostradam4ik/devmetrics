"""
Report generation service: PDF (via WeasyPrint + Jinja2) and CSV exports.
"""
import csv
import io
import logging
from datetime import datetime
from typing import Dict, List

from jinja2 import Environment, BaseLoader

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# HTML template for PDF report
# ---------------------------------------------------------------------------

_PDF_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    color: #1a1a2e;
    padding: 32px 40px;
    line-height: 1.5;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #2563eb;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .logo { font-size: 22px; font-weight: 800; color: #2563eb; }
  .logo span { color: #1a1a2e; }
  .report-meta { text-align: right; color: #6b7280; font-size: 10px; }
  .report-meta h2 { font-size: 14px; color: #1a1a2e; font-weight: 700; margin-bottom: 4px; }

  h3 { font-size: 13px; font-weight: 700; color: #1e3a5f; margin: 20px 0 10px; }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }
  .kpi-card {
    background: #f0f7ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 12px 14px;
  }
  .kpi-value { font-size: 22px; font-weight: 800; color: #2563eb; }
  .kpi-label { font-size: 10px; color: #6b7280; margin-top: 2px; }
  .kpi-change { font-size: 10px; margin-top: 4px; }
  .up { color: #16a34a; }
  .down { color: #dc2626; }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    font-size: 10px;
  }
  thead th {
    background: #1e3a5f;
    color: white;
    padding: 8px 10px;
    text-align: left;
    font-weight: 600;
    letter-spacing: 0.03em;
  }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }

  .section { margin-bottom: 28px; }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 9px;
    font-weight: 600;
  }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-blue  { background: #dbeafe; color: #1e40af; }
  .badge-red   { background: #fee2e2; color: #991b1b; }

  .footer {
    margin-top: 32px;
    border-top: 1px solid #e5e7eb;
    padding-top: 12px;
    font-size: 9px;
    color: #9ca3af;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="logo">Dev<span>Metrics</span></div>
    <div style="color:#6b7280;font-size:10px;margin-top:4px;">AI-Powered Developer Analytics</div>
  </div>
  <div class="report-meta">
    <h2>{{ report_title }}</h2>
    <div>Period: {{ period_start }} — {{ period_end }}</div>
    <div>Generated: {{ generated_at }}</div>
    <div>Organization: {{ org_id }}</div>
  </div>
</div>

<!-- KPI Summary -->
<div class="section">
  <h3>Key Performance Indicators</h3>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-value">{{ metrics.commits.total }}</div>
      <div class="kpi-label">Total Commits</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value">{{ metrics.pull_requests.total }}</div>
      <div class="kpi-label">Pull Requests</div>
      <div class="kpi-change"><span class="badge badge-green">{{ metrics.pull_requests.merge_rate }}% merged</span></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value">{{ metrics.pull_requests.avg_cycle_time_hours }}h</div>
      <div class="kpi-label">Avg Cycle Time</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value">{{ metrics.active_developers }}</div>
      <div class="kpi-label">Active Developers</div>
      <div class="kpi-change">of {{ metrics.team_size }} total</div>
    </div>
  </div>
</div>

<!-- Code Volume -->
<div class="section">
  <h3>Code Volume</h3>
  <table>
    <thead>
      <tr>
        <th>Metric</th><th>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Lines Added</td><td style="color:#16a34a;font-weight:600;">+{{ "{:,}".format(metrics.commits.additions) }}</td></tr>
      <tr><td>Lines Deleted</td><td style="color:#dc2626;font-weight:600;">-{{ "{:,}".format(metrics.commits.deletions) }}</td></tr>
      <tr><td>Net Change</td><td>{{ "{:,}".format(metrics.commits.additions - metrics.commits.deletions) }}</td></tr>
      <tr><td>Open PRs</td><td>{{ metrics.pull_requests.open }}</td></tr>
      <tr><td>Merged PRs</td><td>{{ metrics.pull_requests.merged }}</td></tr>
    </tbody>
  </table>
</div>

<!-- Top Contributors -->
{% if metrics.top_contributors %}
<div class="section">
  <h3>Top Contributors</h3>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Developer</th>
        <th>Commits</th>
        <th>Lines Added</th>
        <th>Lines Deleted</th>
        <th>Net</th>
      </tr>
    </thead>
    <tbody>
      {% for dev in metrics.top_contributors %}
      <tr>
        <td>{{ loop.index }}</td>
        <td><strong>{{ dev.github_login }}</strong></td>
        <td>{{ dev.commits }}</td>
        <td style="color:#16a34a;">+{{ "{:,}".format(dev.additions) }}</td>
        <td style="color:#dc2626;">-{{ "{:,}".format(dev.deletions) }}</td>
        <td>{{ "{:,}".format(dev.additions - dev.deletions) }}</td>
      </tr>
      {% endfor %}
    </tbody>
  </table>
</div>
{% endif %}

<!-- AI Insights -->
{% if insights %}
<div class="section">
  <h3>AI Insights</h3>
  {% for insight in insights %}
  <div style="margin-bottom:10px;padding:10px 12px;background:#fafafa;border-left:3px solid #2563eb;border-radius:4px;">
    <div style="font-weight:600;font-size:11px;margin-bottom:3px;">{{ insight.title }}</div>
    <div style="color:#4b5563;font-size:10px;">{{ insight.summary }}</div>
  </div>
  {% endfor %}
</div>
{% endif %}

<div class="footer">
  <span>DevMetrics — Confidential</span>
  <span>{{ generated_at }}</span>
</div>
</body>
</html>
"""


class ReportGenerator:
    """Generate PDF and CSV reports from metrics data."""

    _jinja_env = Environment(loader=BaseLoader())

    # ------------------------------------------------------------------
    # PDF
    # ------------------------------------------------------------------

    @classmethod
    def generate_pdf(
        cls,
        org_id: str,
        metrics: Dict,
        period_start: str,
        period_end: str,
        report_title: str = "Team Performance Report",
        insights: List[Dict] | None = None,
    ) -> bytes:
        """Render metrics as a PDF and return bytes."""
        try:
            from weasyprint import HTML  # lazy import — optional dependency
        except ImportError:
            raise RuntimeError(
                "WeasyPrint is not installed. Add weasyprint to requirements.txt."
            )

        template = cls._jinja_env.from_string(_PDF_TEMPLATE)
        html_content = template.render(
            org_id=org_id,
            metrics=metrics,
            period_start=period_start,
            period_end=period_end,
            report_title=report_title,
            generated_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
            insights=insights or [],
        )

        return HTML(string=html_content).write_pdf()

    # ------------------------------------------------------------------
    # CSV
    # ------------------------------------------------------------------

    @classmethod
    def generate_team_csv(
        cls,
        metrics: Dict,
        period_start: str,
        period_end: str,
    ) -> str:
        """Generate a CSV string from team metrics."""
        output = io.StringIO()
        writer = csv.writer(output)

        # Header block
        writer.writerow(["DevMetrics — Team Report"])
        writer.writerow(["Period", f"{period_start} to {period_end}"])
        writer.writerow(["Generated", datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")])
        writer.writerow([])

        # KPIs
        writer.writerow(["KPI", "Value"])
        writer.writerow(["Total Commits", metrics["commits"]["total"]])
        writer.writerow(["Lines Added", metrics["commits"]["additions"]])
        writer.writerow(["Lines Deleted", metrics["commits"]["deletions"]])
        writer.writerow(["Total PRs", metrics["pull_requests"]["total"]])
        writer.writerow(["Merged PRs", metrics["pull_requests"]["merged"]])
        writer.writerow(["Open PRs", metrics["pull_requests"]["open"]])
        writer.writerow(["Merge Rate (%)", metrics["pull_requests"]["merge_rate"]])
        writer.writerow(["Avg Cycle Time (h)", metrics["pull_requests"]["avg_cycle_time_hours"]])
        writer.writerow(["Active Developers", metrics["active_developers"]])
        writer.writerow(["Team Size", metrics["team_size"]])
        writer.writerow([])

        # Contributors
        contributors = metrics.get("top_contributors", [])
        if contributors:
            writer.writerow(["Top Contributors"])
            writer.writerow(["Rank", "Developer", "Commits", "Lines Added", "Lines Deleted", "Net Change"])
            for i, dev in enumerate(contributors, 1):
                writer.writerow([
                    i,
                    dev["github_login"],
                    dev["commits"],
                    dev["additions"],
                    dev["deletions"],
                    dev["additions"] - dev["deletions"],
                ])

        return output.getvalue()

    @classmethod
    def generate_timeseries_csv(
        cls,
        data: List[Dict],
        metric_type: str,
        period_start: str,
        period_end: str,
    ) -> str:
        """Generate a CSV from time series data."""
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["DevMetrics — Time Series Export"])
        writer.writerow(["Metric", metric_type])
        writer.writerow(["Period", f"{period_start} to {period_end}"])
        writer.writerow(["Generated", datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")])
        writer.writerow([])
        writer.writerow(["Date", "Value"])
        for row in data:
            writer.writerow([row["date"], row["value"]])

        return output.getvalue()
