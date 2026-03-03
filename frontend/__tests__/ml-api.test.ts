/**
 * Tests for lib/api/ml.ts — validates TypeScript types and fetch behaviour.
 * We mock global fetch so no real HTTP calls are made.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mlAPI, type VelocityTrend, type TeamHealth, type SprintPrediction } from '@/lib/api/ml';

// Mock auth so getAccessToken returns a token without localStorage
vi.mock('@/lib/auth', () => ({
  getAccessToken: vi.fn(() => 'test-token'),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

function respondWith(data: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    statusText: status === 200 ? 'OK' : 'Error',
  });
}

// ---------------------------------------------------------------------------
// getVelocityTrend
// ---------------------------------------------------------------------------

describe('mlAPI.getVelocityTrend', () => {
  const mockTrend: VelocityTrend = {
    trend: 'increasing',
    slope: 1.5,
    r_squared: 0.87,
    change_percent: 15.2,
    forecast_7d: [10, 11, 12, 13, 14, 15, 16],
    mean_value: 8.5,
    interpretation: 'Activity is trending up.',
    metric: 'commits',
    period_days: 30,
  };

  it('calls the correct URL with org and metric params', async () => {
    respondWith(mockTrend);
    await mlAPI.getVelocityTrend('org-123', { metric: 'commits', days: 30 });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/ml/velocity-trend');
    expect(url).toContain('organization_id=org-123');
    expect(url).toContain('metric=commits');
    expect(url).toContain('days=30');
  });

  it('returns typed VelocityTrend data', async () => {
    respondWith(mockTrend);
    const result = await mlAPI.getVelocityTrend('org-123');
    expect(result.trend).toBe('increasing');
    expect(result.forecast_7d).toHaveLength(7);
    expect(result.slope).toBeTypeOf('number');
  });

  it('defaults to commits metric', async () => {
    respondWith(mockTrend);
    await mlAPI.getVelocityTrend('org-123');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('metric=commits');
  });

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'Not found' }),
    });
    await expect(mlAPI.getVelocityTrend('org-123')).rejects.toThrow('Not found');
  });
});

// ---------------------------------------------------------------------------
// getAnomalies
// ---------------------------------------------------------------------------

describe('mlAPI.getAnomalies', () => {
  it('passes method param to URL', async () => {
    respondWith({ anomalies: [], total_anomalies: 0, method: 'zscore', baseline_mean: 10, baseline_std: 2, metric: 'commits', period_days: 60 });
    await mlAPI.getAnomalies('org-abc', { method: 'zscore' });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('method=zscore');
  });

  it('returns empty anomalies list for normal activity', async () => {
    const payload = { anomalies: [], total_anomalies: 0, method: 'combined', baseline_mean: 15, baseline_std: 1, metric: 'commits', period_days: 60 };
    respondWith(payload);
    const result = await mlAPI.getAnomalies('org-abc');
    expect(result.total_anomalies).toBe(0);
    expect(result.anomalies).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getDeveloperScore
// ---------------------------------------------------------------------------

describe('mlAPI.getDeveloperScore', () => {
  it('includes developer_id in URL path', async () => {
    respondWith({ developer_id: 'dev-1', score: 75, grade: 'B', label: 'Strong', dimensions: { throughput: 80, quality: 70, collaboration: 75 }, raw_metrics: {}, period_days: 30 });
    await mlAPI.getDeveloperScore('org-1', 'dev-1', 30);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/ml/developer-score/dev-1');
  });

  it('returns score in 0-100 range from mock', async () => {
    const payload = { developer_id: 'dev-2', score: 42, grade: 'D', label: 'Needs Improvement', dimensions: { throughput: 30, quality: 50, collaboration: 45 }, raw_metrics: {}, period_days: 30 };
    respondWith(payload);
    const result = await mlAPI.getDeveloperScore('org-1', 'dev-2');
    expect(result.score).toBe(42);
    expect(result.grade).toBe('D');
  });
});

// ---------------------------------------------------------------------------
// getTeamHealth
// ---------------------------------------------------------------------------

describe('mlAPI.getTeamHealth', () => {
  const mockHealth: TeamHealth = {
    organization_id: 'org-1',
    period_days: 30,
    score: 72,
    status: 'fair',
    flags: [{ type: 'low_participation', severity: 'high', message: 'Only 3/10 active' }],
    dimensions: { participation: 30, stability: 85, pr_health: 70 },
    team_metrics: {},
  };

  it('calls /ml/team-health with org ID', async () => {
    respondWith(mockHealth);
    await mlAPI.getTeamHealth('org-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/ml/team-health');
    expect(url).toContain('organization_id=org-1');
  });

  it('returns flags array', async () => {
    respondWith(mockHealth);
    const result = await mlAPI.getTeamHealth('org-1');
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].type).toBe('low_participation');
  });

  it('status is valid value', async () => {
    respondWith(mockHealth);
    const result = await mlAPI.getTeamHealth('org-1');
    expect(['healthy', 'fair', 'at_risk', 'critical']).toContain(result.status);
  });
});

// ---------------------------------------------------------------------------
// getSprintPrediction
// ---------------------------------------------------------------------------

describe('mlAPI.getSprintPrediction', () => {
  const mockPrediction: SprintPrediction = {
    organization_id: 'org-1',
    sprint_length_days: 14,
    num_sprints_analyzed: 8,
    historical_velocities: [40, 42, 38, 45, 41, 43, 44, 46],
    predicted: 46.5,
    confidence: 'medium',
    range: [38.0, 55.0],
    trend: 'up',
    r_squared: 0.62,
  };

  it('calls /ml/sprint-prediction', async () => {
    respondWith(mockPrediction);
    await mlAPI.getSprintPrediction('org-1', { sprint_length_days: 14 });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/ml/sprint-prediction');
    expect(url).toContain('sprint_length_days=14');
  });

  it('prediction is positive number', async () => {
    respondWith(mockPrediction);
    const result = await mlAPI.getSprintPrediction('org-1');
    expect(result.predicted).toBeGreaterThan(0);
  });

  it('range has two elements with lo <= hi', async () => {
    respondWith(mockPrediction);
    const result = await mlAPI.getSprintPrediction('org-1');
    expect(result.range).toHaveLength(2);
    expect(result.range[0]).toBeLessThanOrEqual(result.range[1]);
  });

  it('confidence is valid value', async () => {
    respondWith(mockPrediction);
    const result = await mlAPI.getSprintPrediction('org-1');
    expect(['high', 'medium', 'low']).toContain(result.confidence);
  });
});
