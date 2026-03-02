import apiClient from '@/lib/api-client';

export interface DeveloperMetrics {
  commits: {
    total: number;
    additions: number;
    deletions: number;
    files_changed: number;
    avg_per_day: number;
  };
  pull_requests: {
    total: number;
    merged: number;
    closed: number;
    merge_rate: number;
    avg_cycle_time_hours: number;
  };
  period: {
    start: string;
    end: string;
    days: number;
  };
}

export interface TeamMetrics {
  team_size: number;
  active_developers: number;
  commits: {
    total: number;
    additions: number;
    deletions: number;
  };
  pull_requests: {
    total: number;
    merged: number;
    open: number;
    merge_rate: number;
    avg_cycle_time_hours: number;
  };
  top_contributors: Array<{
    developer_id: string;
    github_login: string;
    commits: number;
    additions: number;
    deletions: number;
  }>;
  period: {
    start: string;
    end: string;
    days: number;
  };
}

export interface TimeSeriesData {
  data: Array<{ date: string; value: number }>;
  metric_type: string;
  granularity: string;
}

export interface MetricsSummary {
  total_commits: { value: number; change: number };
  pull_requests: { value: number; change: number };
  active_developers: { value: number; change: number };
  avg_cycle_time: { value: number; change: number };
}

export const metricsAPI = {
  getDeveloperMetrics: async (
    developerId: string,
    organizationId: string,
    startDate?: string,
    endDate?: string
  ) => {
    const params = new URLSearchParams({ organization_id: organizationId });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await apiClient.get<DeveloperMetrics>(
      `/analytics/api/v1/metrics/developer/${developerId}?${params}`
    );
    return response.data;
  },

  getTeamMetrics: async (
    organizationId: string,
    startDate?: string,
    endDate?: string
  ) => {
    const params = new URLSearchParams({ organization_id: organizationId });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await apiClient.get<TeamMetrics>(
      `/analytics/api/v1/metrics/team?${params}`
    );
    return response.data;
  },

  getTimeSeries: async (
    organizationId: string,
    metricType: string,
    startDate?: string,
    endDate?: string,
    granularity: string = 'day'
  ) => {
    const params = new URLSearchParams({
      organization_id: organizationId,
      metric_type: metricType,
      granularity,
    });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await apiClient.get<TimeSeriesData>(
      `/analytics/api/v1/metrics/timeseries?${params}`
    );
    return response.data;
  },

  getSummary: async (organizationId: string) => {
    const response = await apiClient.get<MetricsSummary>(
      `/analytics/api/v1/metrics/summary?organization_id=${organizationId}`
    );
    return response.data;
  },
};
