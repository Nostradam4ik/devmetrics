import axios from 'axios';

const AI_URL = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:8004';

// Dedicated client for the AI service (port 8004) — apiClient points to auth (8001)
const aiClient = axios.create({
  baseURL: `${AI_URL}/api/v1`,
  timeout: 60000, // Groq can be slow on first call
  headers: { 'Content-Type': 'application/json' },
});

aiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

    const response = await aiClient.get<InsightListResponse>(
      `/insights/list?${params}`
    );
    return response.data;
  },

  generate: async (organizationId: string, metricsData: Record<string, unknown>) => {
    const response = await aiClient.post('/insights/generate', {
      organization_id: organizationId,
      metrics_data: metricsData,
    });
    return response.data;
  },

  weeklyReport: async (
    organizationId: string,
    metricsData: Record<string, unknown>
  ): Promise<WeeklyReportResponse> => {
    const response = await aiClient.post<WeeklyReportResponse>(
      '/insights/weekly-report',
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
    const response = await aiClient.post<QueryResponse>(
      '/insights/query',
      {
        query: queryText,
        context_data: contextData,
      }
    );
    return response.data;
  },

  getSuggestions: async (organizationId: string) => {
    const response = await aiClient.get<{ success: boolean; suggestions: Suggestion[] }>(
      `/insights/suggestions?organization_id=${organizationId}`
    );
    return response.data;
  },

  markAsRead: async (insightId: string) => {
    const response = await aiClient.patch(
      `/insights/${insightId}/read`
    );
    return response.data;
  },
};
