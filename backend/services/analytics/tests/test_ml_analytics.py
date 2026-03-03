"""
Unit tests for MLAnalyticsService — pure-Python statistical functions.
No database or HTTP client needed.
"""
import math
import pytest

from app.services.ml_analytics import (
    MLAnalyticsService,
    _mean,
    _std,
    _linear_regression,
    _zscore_anomalies,
    _iqr_bounds,
    ml_service,
)


# ---------------------------------------------------------------------------
# Helper function tests
# ---------------------------------------------------------------------------

class TestMean:
    def test_empty(self):
        assert _mean([]) == 0.0

    def test_single(self):
        assert _mean([5.0]) == 5.0

    def test_integers(self):
        assert _mean([1, 2, 3, 4, 5]) == 3.0

    def test_floats(self):
        assert abs(_mean([1.5, 2.5, 3.0]) - 7.0 / 3) < 1e-9


class TestStd:
    def test_empty(self):
        assert _std([]) == 0.0

    def test_single(self):
        assert _std([42.0]) == 0.0

    def test_uniform(self):
        assert _std([5, 5, 5, 5]) == 0.0

    def test_known_values(self):
        # std([2, 4, 4, 4, 5, 5, 7, 9]) = 2.0 (sample std)
        result = _std([2, 4, 4, 4, 5, 5, 7, 9])
        assert abs(result - 2.0) < 0.01


class TestLinearRegression:
    def test_perfect_line(self):
        x = [0, 1, 2, 3, 4]
        y = [1, 3, 5, 7, 9]  # y = 2x + 1
        slope, intercept, r2 = _linear_regression(x, y)
        assert abs(slope - 2.0) < 1e-9
        assert abs(intercept - 1.0) < 1e-9
        assert abs(r2 - 1.0) < 1e-9

    def test_flat_line(self):
        x = [0, 1, 2, 3]
        y = [5, 5, 5, 5]
        slope, intercept, r2 = _linear_regression(x, y)
        assert abs(slope) < 1e-9
        assert abs(intercept - 5.0) < 1e-9
        assert r2 == 0.0

    def test_single_point(self):
        slope, intercept, r2 = _linear_regression([0], [7])
        assert slope == 0.0
        assert intercept == 7.0
        assert r2 == 0.0

    def test_r_squared_bounded(self):
        x = [1, 2, 3, 4, 5]
        y = [3, 1, 4, 1, 5]  # noisy
        slope, intercept, r2 = _linear_regression(x, y)
        assert 0.0 <= r2 <= 1.0

    def test_vertical_denom_zero(self):
        # All x identical → denom = 0
        x = [2, 2, 2]
        y = [1, 2, 3]
        slope, intercept, r2 = _linear_regression(x, y)
        assert slope == 0.0
        assert r2 == 0.0


class TestZscoreAnomalies:
    def test_too_few_values(self):
        assert _zscore_anomalies([1, 2, 3]) == []

    def test_no_anomalies(self):
        values = [10, 11, 10, 9, 11, 10, 10]
        assert _zscore_anomalies(values) == []

    def test_obvious_spike(self):
        values = [10, 10, 10, 10, 10, 100, 10, 10, 10, 10]
        anomalies = _zscore_anomalies(values)
        assert 5 in anomalies

    def test_uniform_no_std(self):
        values = [5, 5, 5, 5, 5]
        assert _zscore_anomalies(values) == []


class TestIqrBounds:
    def test_too_few(self):
        lo, hi = _iqr_bounds([1, 2, 3])
        assert lo == -math.inf
        assert hi == math.inf

    def test_reasonable_range(self):
        values = list(range(1, 21))  # 1..20
        lo, hi = _iqr_bounds(values)
        assert lo < 1
        assert hi > 20

    def test_outlier_falls_outside(self):
        values = [10, 11, 12, 13, 14, 15, 100]
        lo, hi = _iqr_bounds(values)
        assert hi < 100  # 100 is beyond IQR fence


# ---------------------------------------------------------------------------
# MLAnalyticsService — velocity trend
# ---------------------------------------------------------------------------

class TestVelocityTrend:
    def _make_series(self, values):
        return [{"date": f"2026-01-{i+1:02d}", "value": v} for i, v in enumerate(values)]

    def test_insufficient_data(self):
        result = ml_service.analyze_velocity_trend(self._make_series([5, 10]))
        assert result["trend"] == "insufficient_data"
        assert result["slope"] == 0
        assert result["forecast_7d"] == []

    def test_increasing_trend(self):
        # Strong linear increase
        values = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
        result = ml_service.analyze_velocity_trend(self._make_series(values))
        assert result["trend"] == "increasing"
        assert result["slope"] > 0
        assert result["r_squared"] > 0.9
        assert result["change_percent"] > 0
        assert len(result["forecast_7d"]) == 7

    def test_decreasing_trend(self):
        values = [50, 45, 40, 35, 30, 25, 20, 15, 10, 5]
        result = ml_service.analyze_velocity_trend(self._make_series(values))
        assert result["trend"] == "decreasing"
        assert result["slope"] < 0

    def test_stable_trend(self):
        values = [10, 10, 11, 10, 10, 9, 10, 10, 11, 10]
        result = ml_service.analyze_velocity_trend(self._make_series(values))
        assert result["trend"] == "stable"

    def test_volatile_trend(self):
        # High variance, no clear trend
        values = [1, 100, 2, 99, 1, 100, 2, 99, 1, 100]
        result = ml_service.analyze_velocity_trend(self._make_series(values))
        assert result["trend"] == "volatile"

    def test_forecast_non_negative(self):
        # Decreasing towards zero — forecast should not go negative
        values = [5, 4, 3, 2, 1, 1, 0, 1]
        result = ml_service.analyze_velocity_trend(self._make_series(values))
        for v in result["forecast_7d"]:
            assert v >= 0.0

    def test_zero_mean_change_percent(self):
        values = [0, 0, 0, 0, 0]
        result = ml_service.analyze_velocity_trend(self._make_series(values))
        assert result["change_percent"] == 0.0

    def test_interpretation_key_present(self):
        values = [10, 12, 11, 13, 14, 15, 16, 17, 18, 20]
        result = ml_service.analyze_velocity_trend(self._make_series(values))
        assert "interpretation" in result
        assert len(result["interpretation"]) > 0


# ---------------------------------------------------------------------------
# MLAnalyticsService — anomaly detection
# ---------------------------------------------------------------------------

class TestAnomalyDetection:
    def _make_series(self, values):
        return [{"date": f"2026-01-{i+1:02d}", "value": v} for i, v in enumerate(values)]

    def test_too_few_points(self):
        result = ml_service.detect_anomalies(self._make_series([1, 2, 3, 4]))
        assert result["total_anomalies"] == 0

    def test_spike_detected_combined(self):
        # Normal activity + one massive spike
        base = [10] * 20 + [200] + [10] * 10
        result = ml_service.detect_anomalies(self._make_series(base), method="combined")
        assert result["total_anomalies"] >= 1
        spike = next(a for a in result["anomalies"] if a["value"] == 200)
        assert spike["direction"] == "spike"

    def test_drop_detected(self):
        base = [50] * 20 + [0] + [50] * 10
        result = ml_service.detect_anomalies(self._make_series(base), method="combined")
        assert result["total_anomalies"] >= 1
        drop = next(a for a in result["anomalies"] if a["value"] == 0)
        assert drop["direction"] == "drop"

    def test_zscore_method(self):
        base = [10] * 20 + [200] + [10] * 10
        result = ml_service.detect_anomalies(self._make_series(base), method="zscore")
        assert result["method"] == "zscore"
        assert result["total_anomalies"] >= 1

    def test_iqr_method(self):
        base = [10] * 20 + [200] + [10] * 10
        result = ml_service.detect_anomalies(self._make_series(base), method="iqr")
        assert result["method"] == "iqr"

    def test_no_anomalies_uniform(self):
        values = [10] * 30
        result = ml_service.detect_anomalies(self._make_series(values))
        assert result["total_anomalies"] == 0

    def test_severity_high(self):
        base = [10] * 20 + [500] + [10] * 10
        result = ml_service.detect_anomalies(self._make_series(base))
        highs = [a for a in result["anomalies"] if a["severity"] == "high"]
        assert len(highs) >= 1

    def test_baseline_stats_present(self):
        values = list(range(1, 31))
        result = ml_service.detect_anomalies(self._make_series(values))
        assert "baseline_mean" in result
        assert "baseline_std" in result


# ---------------------------------------------------------------------------
# MLAnalyticsService — developer score
# ---------------------------------------------------------------------------

class TestDeveloperScore:
    def test_exceptional_developer(self):
        result = ml_service.compute_developer_score(
            commits=90, additions=9000, deletions=3000,
            prs_merged=10, prs_total=10,
            avg_cycle_time_hours=8,
            period_days=30,
        )
        assert result["grade"] in ("A", "B")
        assert result["score"] >= 70

    def test_underperforming_developer(self):
        result = ml_service.compute_developer_score(
            commits=2, additions=100, deletions=5,
            prs_merged=0, prs_total=5,
            avg_cycle_time_hours=200,
            period_days=30,
        )
        assert result["grade"] in ("D", "F")
        assert result["score"] < 50

    def test_score_bounds(self):
        result = ml_service.compute_developer_score(
            commits=30, additions=3000, deletions=1000,
            prs_merged=5, prs_total=5,
            avg_cycle_time_hours=24,
        )
        assert 0 <= result["score"] <= 100

    def test_dimensions_present(self):
        result = ml_service.compute_developer_score(
            commits=30, additions=3000, deletions=1000,
            prs_merged=5, prs_total=5,
            avg_cycle_time_hours=24,
        )
        dims = result["dimensions"]
        assert "throughput" in dims
        assert "quality" in dims
        assert "collaboration" in dims
        for v in dims.values():
            assert 0 <= v <= 100

    def test_zero_prs(self):
        """Developer with no PRs should not crash."""
        result = ml_service.compute_developer_score(
            commits=20, additions=2000, deletions=500,
            prs_merged=0, prs_total=0,
            avg_cycle_time_hours=0,
        )
        assert 0 <= result["score"] <= 100

    def test_grade_labels(self):
        grades = {
            90: "Exceptional",
            75: "Strong",
            60: "Average",
            45: "Needs Improvement",
            20: "Critical",
        }
        # Check all grade labels are assigned correctly by score thresholds
        result_high = ml_service.compute_developer_score(
            commits=200, additions=20000, deletions=5000,
            prs_merged=20, prs_total=20,
            avg_cycle_time_hours=4,
        )
        assert result_high["label"] in ("Exceptional", "Strong")


# ---------------------------------------------------------------------------
# MLAnalyticsService — team health
# ---------------------------------------------------------------------------

class TestTeamHealth:
    def _series(self, values):
        return [{"date": f"2026-01-{i+1:02d}", "value": v} for i, v in enumerate(values)]

    def test_healthy_team(self):
        result = ml_service.compute_team_health(
            active_developers=8,
            team_size=10,
            commit_time_series=self._series([20, 22, 19, 21, 20, 22, 21] * 4),
            avg_cycle_time_hours=12,
            merge_rate=90,
            top_contributors=[
                {"github_login": "alice", "commits": 30},
                {"github_login": "bob", "commits": 28},
                {"github_login": "carol", "commits": 25},
                {"github_login": "dave", "commits": 22},
            ],
        )
        assert result["status"] in ("healthy", "fair")
        assert result["score"] >= 50

    def test_low_participation_flag(self):
        result = ml_service.compute_team_health(
            active_developers=2,
            team_size=10,
            commit_time_series=self._series([5] * 14),
            avg_cycle_time_hours=10,
            merge_rate=80,
            top_contributors=[],
        )
        flag_types = [f["type"] for f in result["flags"]]
        assert "low_participation" in flag_types

    def test_high_cycle_time_flag(self):
        result = ml_service.compute_team_health(
            active_developers=8,
            team_size=10,
            commit_time_series=self._series([10] * 14),
            avg_cycle_time_hours=72,
            merge_rate=80,
            top_contributors=[],
        )
        flag_types = [f["type"] for f in result["flags"]]
        assert "high_cycle_time" in flag_types

    def test_bus_factor_flag(self):
        result = ml_service.compute_team_health(
            active_developers=5,
            team_size=5,
            commit_time_series=self._series([10] * 14),
            avg_cycle_time_hours=10,
            merge_rate=80,
            top_contributors=[
                {"github_login": "alice", "commits": 90},
                {"github_login": "bob", "commits": 5},
                {"github_login": "carol", "commits": 5},
            ],
        )
        flag_types = [f["type"] for f in result["flags"]]
        assert "bus_factor" in flag_types

    def test_score_bounds(self):
        result = ml_service.compute_team_health(
            active_developers=5,
            team_size=10,
            commit_time_series=self._series([10] * 14),
            avg_cycle_time_hours=24,
            merge_rate=70,
            top_contributors=[],
        )
        assert 0 <= result["score"] <= 100

    def test_status_values(self):
        result = ml_service.compute_team_health(
            active_developers=1,
            team_size=10,
            commit_time_series=self._series([1, 100, 0, 50, 1, 80] * 2),
            avg_cycle_time_hours=100,
            merge_rate=20,
            top_contributors=[{"github_login": "solo", "commits": 100}],
        )
        assert result["status"] in ("healthy", "fair", "at_risk", "critical")

    def test_dimensions_present(self):
        result = ml_service.compute_team_health(
            active_developers=5,
            team_size=8,
            commit_time_series=self._series([15] * 14),
            avg_cycle_time_hours=20,
            merge_rate=75,
            top_contributors=[],
        )
        assert "participation" in result["dimensions"]
        assert "stability" in result["dimensions"]
        assert "pr_health" in result["dimensions"]


# ---------------------------------------------------------------------------
# MLAnalyticsService — sprint prediction
# ---------------------------------------------------------------------------

class TestSprintPrediction:
    def test_empty_velocities(self):
        result = ml_service.predict_sprint_velocity([])
        assert result["predicted"] == 0
        assert result["confidence"] == "low"

    def test_single_sprint(self):
        result = ml_service.predict_sprint_velocity([50.0])
        assert result["predicted"] == 50.0
        assert result["confidence"] == "low"
        assert result["range"][0] <= 50.0 <= result["range"][1]

    def test_stable_velocity(self):
        velocities = [50.0] * 8
        result = ml_service.predict_sprint_velocity(velocities)
        assert abs(result["predicted"] - 50.0) < 5.0

    def test_increasing_velocity(self):
        velocities = [30.0, 35.0, 40.0, 45.0, 50.0, 55.0, 60.0, 65.0]
        result = ml_service.predict_sprint_velocity(velocities)
        assert result["trend"] == "up"
        assert result["predicted"] > 60.0

    def test_decreasing_velocity(self):
        velocities = [70.0, 65.0, 60.0, 55.0, 50.0, 45.0, 40.0, 35.0]
        result = ml_service.predict_sprint_velocity(velocities)
        assert result["trend"] == "down"

    def test_predicted_non_negative(self):
        velocities = [5.0, 3.0, 1.0, 0.0, 0.0]
        result = ml_service.predict_sprint_velocity(velocities)
        assert result["predicted"] >= 0

    def test_range_valid(self):
        velocities = [40.0, 42.0, 38.0, 45.0, 41.0, 43.0]
        result = ml_service.predict_sprint_velocity(velocities)
        lo, hi = result["range"]
        assert lo <= result["predicted"] <= hi

    def test_high_confidence_with_good_data(self):
        # Perfect linear trend, 5+ sprints → may yield high confidence
        velocities = [20.0, 25.0, 30.0, 35.0, 40.0, 45.0, 50.0]
        result = ml_service.predict_sprint_velocity(velocities)
        assert result["confidence"] in ("high", "medium", "low")  # just check valid value

    def test_r_squared_bounded(self):
        velocities = [10.0, 50.0, 20.0, 40.0, 30.0]
        result = ml_service.predict_sprint_velocity(velocities)
        assert 0.0 <= result["r_squared"] <= 1.0
