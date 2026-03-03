import apiClient from '@/lib/api-client';

export interface Integration {
  id: string;
  provider: 'slack' | 'jira';
  name: string | null;
  is_active: boolean;
  channel_name: string | null;
  external_url: string | null;
  notification_config: {
    sync_complete?: boolean;
    sync_failed?: boolean;
    new_insight?: boolean;
    weekly_report?: boolean;
    pr_merged?: boolean;
    daily_digest?: boolean;
  };
  created_at: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  type: string;
}

export interface JiraMetrics {
  total_issues: number;
  resolved: number;
  resolution_rate: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  period_days: number;
}

export interface SprintData {
  total: number;
  issues: Array<{
    key: string;
    summary: string;
    status: string;
    assignee: string | null;
    type: string;
  }>;
  status_summary: Record<string, number>;
}

export const integrationsAPI = {
  list: async (orgId: string): Promise<{ integrations: Integration[] }> => {
    const res = await apiClient.get(`/auth/api/v1/integrations/?organization_id=${orgId}`);
    return res.data;
  },

  // Slack
  getSlackOAuthUrl: async (orgId: string): Promise<{ url: string }> => {
    const res = await apiClient.get(`/auth/api/v1/integrations/slack/oauth-url?organization_id=${orgId}`);
    return res.data;
  },

  connectSlack: async (code: string, orgId: string) => {
    const res = await apiClient.post('/auth/api/v1/integrations/slack/callback', {
      code,
      org_id: orgId,
    });
    return res.data;
  },

  testSlack: async (orgId: string) => {
    const res = await apiClient.post(`/auth/api/v1/integrations/slack/test?organization_id=${orgId}`);
    return res.data;
  },

  updateSlackNotifications: async (
    orgId: string,
    config: Integration['notification_config']
  ) => {
    const res = await apiClient.patch(
      `/auth/api/v1/integrations/slack/notifications?organization_id=${orgId}`,
      config
    );
    return res.data;
  },

  // Jira
  getJiraOAuthUrl: async (orgId: string): Promise<{ url: string }> => {
    const res = await apiClient.get(`/auth/api/v1/integrations/jira/oauth-url?organization_id=${orgId}`);
    return res.data;
  },

  connectJira: async (code: string, orgId: string) => {
    const res = await apiClient.post('/auth/api/v1/integrations/jira/callback', {
      code,
      org_id: orgId,
    });
    return res.data;
  },

  getJiraProjects: async (orgId: string): Promise<{ projects: JiraProject[] }> => {
    const res = await apiClient.get(`/auth/api/v1/integrations/jira/projects?organization_id=${orgId}`);
    return res.data;
  },

  getJiraMetrics: async (
    orgId: string,
    projectKey: string,
    days = 30
  ): Promise<JiraMetrics> => {
    const res = await apiClient.get(
      `/auth/api/v1/integrations/jira/metrics?organization_id=${orgId}&project_key=${projectKey}&days=${days}`
    );
    return res.data;
  },

  getJiraSprint: async (orgId: string, projectKey: string): Promise<SprintData> => {
    const res = await apiClient.get(
      `/auth/api/v1/integrations/jira/sprint?organization_id=${orgId}&project_key=${projectKey}`
    );
    return res.data;
  },

  // Disconnect
  disconnect: async (orgId: string, provider: string) => {
    const res = await apiClient.delete(
      `/auth/api/v1/integrations/${provider}?organization_id=${orgId}`
    );
    return res.data;
  },
};
