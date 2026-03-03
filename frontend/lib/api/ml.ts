import { getAccessToken } from '@/lib/auth';

const ANALYTICS_BASE =
  process.env.NEXT_PUBLIC_ANALYTICS_API_URL ?? 'http://localhost:8003';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VelocityTrend {
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile' | 'insufficient_data';
  slope: number;
  r_squared: number;
  change_percent: number;
  forecast_7d: number[];
  mean_value: number;
  interpretation: string;
  metric: string;
  period_days: number;
}

export interface Anomaly {
  index: number;
  date: string;
  value: number;
  z_score: number;
  direction: 'spike' | 'drop';
  severity: 'high' | 'medium';
}

export interface AnomalyDetection {
  anomalies: Anomaly[];
  total_anomalies: number;
  method: string;
  baseline_mean: number;
  baseline_std: number;
  metric: string;
  period_days: number;
}

export interface DeveloperScore {
  developer_id: string;
  period_days: number;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  label: string;
  dimensions: {
    throughput: number;
    quality: number;
    collaboration: number;
  };
  raw_metrics: Record<string, unknown>;
}

export interface TeamHealthFlag {
  type: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
}

export interface TeamHealth {
  organization_id: string;
  period_days: number;
  score: number;
  status: 'healthy' | 'fair' | 'at_risk' | 'critical';
  flags: TeamHealthFlag[];
  dimensions: {
    participation: number;
    stability: number;
    pr_health: number;
  };
  team_metrics: Record<string, unknown>;
}

export interface SprintPrediction {
  organization_id: string;
  sprint_length_days: number;
  num_sprints_analyzed: number;
  historical_velocities: number[];
  predicted: number;
  confidence: 'high' | 'medium' | 'low';
  range: [number, number];
  trend?: 'up' | 'down' | 'flat';
  r_squared?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function authHeaders() {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const headers = await authHeaders();
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  const res = await fetch(`${ANALYTICS_BASE}/api/v1${path}?${qs}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const mlAPI = {
  getVelocityTrend: (
    orgId: string,
    opts?: { metric?: string; days?: number }
  ): Promise<VelocityTrend> =>
    get('/ml/velocity-trend', {
      organization_id: orgId,
      metric: opts?.metric ?? 'commits',
      days: opts?.days ?? 30,
    }),

  getAnomalies: (
    orgId: string,
    opts?: { metric?: string; method?: string; days?: number }
  ): Promise<AnomalyDetection> =>
    get('/ml/anomalies', {
      organization_id: orgId,
      metric: opts?.metric ?? 'commits',
      method: opts?.method ?? 'combined',
      days: opts?.days ?? 60,
    }),

  getDeveloperScore: (
    orgId: string,
    developerId: string,
    days = 30
  ): Promise<DeveloperScore> =>
    get(`/ml/developer-score/${developerId}`, {
      organization_id: orgId,
      days,
    }),

  getTeamHealth: (orgId: string, days = 30): Promise<TeamHealth> =>
    get('/ml/team-health', { organization_id: orgId, days }),

  getSprintPrediction: (
    orgId: string,
    opts?: { sprint_length_days?: number; num_sprints?: number }
  ): Promise<SprintPrediction> =>
    get('/ml/sprint-prediction', {
      organization_id: orgId,
      sprint_length_days: opts?.sprint_length_days ?? 14,
      num_sprints: opts?.num_sprints ?? 8,
    }),
};
