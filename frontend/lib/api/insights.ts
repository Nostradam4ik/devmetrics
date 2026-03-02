import apiClient from '@/lib/api-client';

export interface Insight {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  severity: string | null;
  category: string | null;
  is_read: boolean;
  generated_at: string;
}

export interface InsightListResponse {
  insights: Insight[];
  total: number;
}

export interface Suggestion {
  title: string;
  description: string;
  priority: string;
  category?: string;
}

export interface QueryResponse {
  success: boolean;
  query: string;
  answer: string;
}

export interface WeeklyReportResponse {
  success: boolean;
  report: string;
  generated_at: string;
}

export const insightsAPI = {
  list: async (organizationId: string, type?: string, limit = 20) => {
    const params = new URLSearchParams({ organization_id: organizationId });
    if (type) params.append('type', type);
    params.append('limit', String(limit));

    const response = await apiClient.get<InsightListResponse>(
      `/ai/api/v1/insights/list?${params}`
    );
    return response.data;
  },

  generate: async (organizationId: string, metricsData: Record<string, unknown>) => {
    const response = await apiClient.post('/ai/api/v1/insights/generate', {
      organization_id: organizationId,
      metrics_data: metricsData,
    });
    return response.data;
  },

  weeklyReport: async (
    organizationId: string,
    metricsData: Record<string, unknown>
  ): Promise<WeeklyReportResponse> => {
    const response = await apiClient.post<WeeklyReportResponse>(
      '/ai/api/v1/insights/weekly-report',
      {
        organization_id: organizationId,
        metrics_data: metricsData,
      }
    );
    return response.data;
  },

  query: async (
    queryText: string,
    contextData?: Record<string, unknown>
  ): Promise<QueryResponse> => {
    const response = await apiClient.post<QueryResponse>(
      '/ai/api/v1/insights/query',
      {
        query: queryText,
        context_data: contextData,
      }
    );
    return response.data;
  },

  getSuggestions: async (organizationId: string) => {
    const response = await apiClient.get<{ success: boolean; suggestions: Suggestion[] }>(
      `/ai/api/v1/insights/suggestions?organization_id=${organizationId}`
    );
    return response.data;
  },

  markAsRead: async (insightId: string) => {
    const response = await apiClient.patch(
      `/ai/api/v1/insights/${insightId}/read`
    );
    return response.data;
  },
};
