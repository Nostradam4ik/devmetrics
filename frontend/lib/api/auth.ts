import apiClient from '../api-client';
import { LoginCredentials, RegisterData, User, AuthTokens } from '../auth';

export const authAPI = {
  register: async (data: RegisterData) => {
    const response = await apiClient.post<{
      message: string;
      user: User;
      tokens: AuthTokens;
    }>('/auth/register', data);
    return response.data;
  },

  login: async (credentials: LoginCredentials) => {
    const response = await apiClient.post<{
      message: string;
      user: User;
      tokens: AuthTokens;
    }>('/auth/login', credentials);
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post<AuthTokens>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  getGitHubAuthURL: async () => {
    const response = await apiClient.get<{ auth_url: string }>(
      '/oauth/github/authorize'
    );
    return response.data;
  },
};
