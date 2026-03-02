import apiClient from '@/lib/api-client';

export interface Repository {
  id: string;
  organization_id: string;
  github_repo_id: number;
  full_name: string;
  name: string;
  description?: string;
  default_branch: string;
  is_private: boolean;
  language?: string;
  is_active: boolean;
  last_synced_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface RepositoryListResponse {
  repositories: Repository[];
  total: number;
}

export interface SyncStatusResponse {
  repository_id: string;
  status: string;
  last_synced_at?: string;
  commits_synced?: number;
  prs_synced?: number;
}

export const repositoriesAPI = {
  list: async (organizationId: string) => {
    const response = await apiClient.get<RepositoryListResponse>(
      `/ingestion/api/v1/repositories?organization_id=${organizationId}`
    );
    return response.data;
  },

  get: async (repositoryId: string) => {
    const response = await apiClient.get<Repository>(
      `/ingestion/api/v1/repositories/${repositoryId}`
    );
    return response.data;
  },

  add: async (organizationId: string, data: {
    github_repo_id: number;
    full_name: string;
    name: string;
    description?: string;
    default_branch?: string;
    is_private?: boolean;
    language?: string;
    github_access_token: string;
  }) => {
    const response = await apiClient.post<Repository>(
      `/ingestion/api/v1/repositories?organization_id=${organizationId}`,
      data
    );
    return response.data;
  },

  remove: async (repositoryId: string) => {
    const response = await apiClient.delete(
      `/ingestion/api/v1/repositories/${repositoryId}`
    );
    return response.data;
  },

  triggerSync: async (repositoryId: string) => {
    const response = await apiClient.post<SyncStatusResponse>(
      `/ingestion/api/v1/repositories/${repositoryId}/sync`
    );
    return response.data;
  },
};
