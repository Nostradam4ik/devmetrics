"""
ML Analytics Service — pure-Python statistical analysis with numpy/scipy.

Provides:
- Velocity trend detection (linear regression on commit/PR time series)
- Anomaly detection (Z-score + IQR on commit activity)
- Developer performance scoring (composite index)
- Team health score
- Sprint velocity prediction
"""
import logging
import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pure-math helpers (fallback if numpy unavailable)
# ---------------------------------------------------------------------------

def _mean(values: List[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _std(values: List[float]) -> float:
    if len(values) < 2:
        return 0.0
    m = _mean(values)
    variance = sum((x - m) ** 2 for x in values) / (len(values) - 1)
    return math.sqrt(variance)


def _linear_regression(x: List[float], y: List[float]) -> Tuple[float, float, float]:
    """Return (slope, intercept, r_squared)."""
    n = len(x)
    if n < 2:
        return 0.0, y[0] if y else 0.0, 0.0

    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_x2 = sum(xi ** 2 for xi in x)

    denom = n * sum_x2 - sum_x ** 2
    if denom == 0:
        return 0.0, _mean(y), 0.0

    slope = (n * sum_xy - sum_x * sum_y) / denom
    intercept = (sum_y - slope * sum_x) / n

    # R²
    y_mean = sum_y / n
    ss_tot = sum((yi - y_mean) ** 2 for yi in y)
    ss_res = sum((yi - (slope * xi + intercept)) ** 2 for xi, yi in zip(x, y))
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

    return slope, intercept, max(0.0, min(1.0, r_squared))


def _zscore_anomalies(values: List[float], threshold: float = 2.5) -> List[int]:
    """Return indices of anomalous values (|z| > threshold)."""
    if len(values) < 4:
        return []
    m = _mean(values)
    s = _std(values)
    if s == 0:
        return []
    return [i for i, v in enumerate(values) if abs((v - m) / s) > threshold]


def _iqr_bounds(values: List[float]) -> Tuple[float, float]:
    """Return (lower, upper) IQR fence at 1.5× IQR."""
    if len(values) < 4:
        return -math.inf, math.inf
    sorted_v = sorted(values)
    n = len(sorted_v)
    q1 = sorted_v[n // 4]
    q3 = sorted_v[(3 * n) // 4]
    iqr = q3 - q1
    return q1 - 1.5 * iqr, q3 + 1.5 * iqr


# ---------------------------------------------------------------------------
# Main Service
# ---------------------------------------------------------------------------

class MLAnalyticsService:
    """Statistical ML analytics — no external model required."""

    # ------------------------------------------------------------------
    # Velocity trend analysis
    # ------------------------------------------------------------------

    @staticmethod
    def analyze_velocity_trend(
        time_series: List[Dict],  # [{"date": "2026-01-01", "value": 12}, ...]
    ) -> Dict:
        """
        Fit a linear regression on the time series and classify the trend.
        Returns slope, r², trend classification, and a 7-day forecast.
        """
        if len(time_series) < 3:
            return {
                "trend": "insufficient_data",
                "slope": 0,
                "r_squared": 0,
                "change_percent": 0,
                "forecast_7d": [],
                "interpretation": "Not enough data points for trend analysis.",
            }

        x = list(range(len(time_series)))
        y = [float(p["value"]) for p in time_series]

        slope, intercept, r_squared = _linear_regression(x, y)

        # Classify trend
        mean_val = _mean(y)
        if mean_val == 0:
            change_pct = 0.0
        else:
            # Projected change over the whole period
            change_pct = round((slope * len(x)) / mean_val * 100, 1)

        if r_squared < 0.2:
            trend = "volatile"
        elif slope > 0.1:
            trend = "increasing"
        elif slope < -0.1:
            trend = "decreasing"
        else:
            trend = "stable"

        # 7-day forecast
        last_x = len(time_series) - 1
        forecast = []
        for i in range(1, 8):
            val = max(0.0, slope * (last_x + i) + intercept)
            forecast.append(round(val, 1))

        # Human interpretation
        interpretations = {
            "increasing": f"Activity is trending up (+{change_pct}%). Team velocity is accelerating.",
            "decreasing": f"Activity is trending down ({change_pct}%). Investigate potential blockers.",
            "stable": "Activity is stable. Team is maintaining consistent velocity.",
            "volatile": "Activity is highly variable. Consider smoothing work distribution.",
        }

        return {
            "trend": trend,
            "slope": round(slope, 4),
            "r_squared": round(r_squared, 3),
            "change_percent": change_pct,
            "forecast_7d": forecast,
            "mean_value": round(mean_val, 1),
            "interpretation": interpretations[trend],
        }

    # ------------------------------------------------------------------
    # Anomaly detection
    # ------------------------------------------------------------------

    @staticmethod
    def detect_anomalies(
        time_series: List[Dict],
        method: str = "combined",  # zscore | iqr | combined
    ) -> Dict:
        """
        Detect anomalous days in the time series.
        Returns anomalous indices, dates, values, and severity.
        """
        if len(time_series) < 5:
            return {"anomalies": [], "total_anomalies": 0, "method": method}

        values = [float(p["value"]) for p in time_series]

        zscore_idx = set(_zscore_anomalies(values))
        lower, upper = _iqr_bounds(values)
        iqr_idx = {i for i, v in enumerate(values) if v < lower or v > upper}

        if method == "zscore":
            anomaly_idx = zscore_idx
        elif method == "iqr":
            anomaly_idx = iqr_idx
        else:  # combined — intersection for fewer false positives
            anomaly_idx = zscore_idx & iqr_idx
            if not anomaly_idx:  # fall back to union if no overlap
                anomaly_idx = zscore_idx | iqr_idx

        m = _mean(values)
        s = _std(values)

        anomalies = []
        for idx in sorted(anomaly_idx):
            val = values[idx]
            z = abs((val - m) / s) if s > 0 else 0
            anomalies.append({
                "index": idx,
                "date": time_series[idx]["date"],
                "value": val,
                "z_score": round(z, 2),
                "direction": "spike" if val > m else "drop",
                "severity": "high" if z > 3 else "medium",
            })

        return {
            "anomalies": anomalies,
            "total_anomalies": len(anomalies),
            "method": method,
            "baseline_mean": round(m, 2),
            "baseline_std": round(s, 2),
        }

    # ------------------------------------------------------------------
    # Developer performance score
    # ------------------------------------------------------------------

    @staticmethod
    def compute_developer_score(
        commits: int,
        additions: int,
        deletions: int,
        prs_merged: int,
        prs_total: int,
        avg_cycle_time_hours: float,
        period_days: int = 30,
        # Population averages for normalization
        avg_commits: float = 30,
        avg_additions: float = 3000,
        avg_cycle_time: float = 24,
    ) -> Dict:
        """
        Compute a 0–100 composite developer score.

        Dimensions:
        - Throughput (40%): commits/day relative to average
        - Code Quality (30%): net additions focus (not just churn), PR merge rate
        - Collaboration (30%): PR cycle time (lower = better)
        """
        days = max(period_days, 1)

        # Throughput: normalize to avg_commits/30d
        commits_per_day = commits / days
        avg_per_day = avg_commits / 30
        throughput_raw = (commits_per_day / avg_per_day) if avg_per_day > 0 else 0
        throughput = min(throughput_raw, 2.0) * 50  # cap at 100

        # Code quality: PR merge rate
        merge_rate = (prs_merged / prs_total * 100) if prs_total > 0 else 50
        # Net churn (smaller is better — targeted changes)
        total_lines = additions + deletions
        churn_ratio = (deletions / total_lines) if total_lines > 0 else 0
        # Good churn ~30-40%: refactoring is healthy
        churn_score = 100 - abs(churn_ratio - 0.35) * 100
        quality = (merge_rate * 0.6 + churn_score * 0.4)

        # Collaboration: cycle time (avg_cycle_time = benchmark)
        if avg_cycle_time_hours <= 0:
            collab = 50
        else:
            ratio = avg_cycle_time / max(avg_cycle_time_hours, 0.5)
            collab = min(ratio * 50, 100)

        # Weighted composite
        score = (throughput * 0.4 + quality * 0.3 + collab * 0.3)
        score = max(0, min(100, round(score, 1)))

        # Grade
        if score >= 85:
            grade, label = "A", "Exceptional"
        elif score >= 70:
            grade, label = "B", "Strong"
        elif score >= 55:
            grade, label = "C", "Average"
        elif score >= 40:
            grade, label = "D", "Needs Improvement"
        else:
            grade, label = "F", "Critical"

        return {
            "score": score,
            "grade": grade,
            "label": label,
            "dimensions": {
                "throughput": round(min(throughput, 100), 1),
                "quality": round(quality, 1),
                "collaboration": round(collab, 1),
            },
        }

    # ------------------------------------------------------------------
    # Team health score
    # ------------------------------------------------------------------

    @staticmethod
    def compute_team_health(
        active_developers: int,
        team_size: int,
        commit_time_series: List[Dict],
        avg_cycle_time_hours: float,
        merge_rate: float,
        top_contributors: List[Dict],
    ) -> Dict:
        """
        Compute a 0–100 team health score and actionable flags.
        """
        flags = []
        score_parts = []

        # 1. Participation rate
        participation = (active_developers / team_size * 100) if team_size > 0 else 0
        score_parts.append(participation)
        if participation < 60:
            flags.append({
                "type": "low_participation",
                "severity": "high",
                "message": f"Only {active_developers}/{team_size} developers are active.",
            })

        # 2. Velocity stability (std/mean coefficient of variation)
        if commit_time_series:
            vals = [float(p["value"]) for p in commit_time_series]
            m = _mean(vals)
            s = _std(vals)
            cv = (s / m) if m > 0 else 1.0
            # CV < 0.3 = stable, CV > 0.7 = volatile
            stability_score = max(0, 100 - cv * 100)
            score_parts.append(stability_score)
            if cv > 0.6:
                flags.append({
                    "type": "volatile_velocity",
                    "severity": "medium",
                    "message": "Commit activity is highly irregular (CV={:.2f}).".format(cv),
                })
        else:
            score_parts.append(50)

        # 3. PR health: merge rate + cycle time
        if merge_rate < 70:
            flags.append({
                "type": "low_merge_rate",
                "severity": "medium",
                "message": f"PR merge rate is {merge_rate}% (target: ≥70%).",
            })
        pr_health = (merge_rate * 0.5) + (max(0, 100 - avg_cycle_time_hours * 2) * 0.5)
        score_parts.append(pr_health)
        if avg_cycle_time_hours > 48:
            flags.append({
                "type": "high_cycle_time",
                "severity": "high",
                "message": f"Average PR cycle time is {avg_cycle_time_hours:.1f}h (target: <48h).",
            })

        # 4. Contribution concentration (Herfindahl index)
        if top_contributors:
            total_commits = sum(c.get("commits", 0) for c in top_contributors)
            if total_commits > 0:
                shares = [c.get("commits", 0) / total_commits for c in top_contributors]
                hhi = sum(s ** 2 for s in shares)
                # HHI: 1 = one person does everything, 1/n = equal
                concentration_score = max(0, 100 - hhi * 100)
                score_parts.append(concentration_score)
                if hhi > 0.4:
                    top = top_contributors[0].get("github_login", "unknown")
                    flags.append({
                        "type": "bus_factor",
                        "severity": "high",
                        "message": f"High contribution concentration. '{top}' dominates commits.",
                    })

        health_score = round(_mean(score_parts), 1)

        if health_score >= 80:
            status = "healthy"
        elif health_score >= 60:
            status = "fair"
        elif health_score >= 40:
            status = "at_risk"
        else:
            status = "critical"

        return {
            "score": health_score,
            "status": status,
            "flags": flags,
            "dimensions": {
                "participation": round(participation, 1),
                "stability": round(score_parts[1] if len(score_parts) > 1 else 50, 1),
                "pr_health": round(pr_health, 1),
            },
        }

    # ------------------------------------------------------------------
    # Sprint velocity prediction
    # ------------------------------------------------------------------

    @staticmethod
    def predict_sprint_velocity(
        historical_velocities: List[float],  # commits or story points per sprint
        sprint_length_days: int = 14,
    ) -> Dict:
        """Predict next sprint velocity using weighted moving average + trend."""
        if not historical_velocities:
            return {"predicted": 0, "confidence": "low", "range": [0, 0]}

        n = len(historical_velocities)
        if n == 1:
            v = historical_velocities[0]
            return {
                "predicted": round(v, 1),
                "confidence": "low",
                "range": [round(v * 0.7, 1), round(v * 1.3, 1)],
            }

        # Exponentially weighted: more recent sprints matter more
        weights = [0.5 ** (n - 1 - i) for i in range(n)]
        total_weight = sum(weights)
        ema = sum(w * v for w, v in zip(weights, historical_velocities)) / total_weight

        # Trend adjustment
        x = list(range(n))
        slope, _, r2 = _linear_regression(x, [float(v) for v in historical_velocities])
        trend_adjusted = ema + slope  # project one step

        predicted = max(0, round(trend_adjusted, 1))
        s = _std([float(v) for v in historical_velocities])

        # Confidence based on r² and number of sprints
        if r2 > 0.7 and n >= 5:
            confidence = "high"
            margin = s * 1.0
        elif r2 > 0.4 and n >= 3:
            confidence = "medium"
            margin = s * 1.5
        else:
            confidence = "low"
            margin = s * 2.0

        return {
            "predicted": predicted,
            "confidence": confidence,
            "range": [
                max(0, round(predicted - margin, 1)),
                round(predicted + margin, 1),
            ],
            "trend": "up" if slope > 0 else "down" if slope < 0 else "flat",
            "r_squared": round(r2, 3),
        }


ml_service = MLAnalyticsService()
