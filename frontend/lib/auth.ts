export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  github_login: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
}

export const setAuthTokens = (tokens: AuthTokens) => {
  localStorage.setItem('access_token', tokens.access_token);
  localStorage.setItem('refresh_token', tokens.refresh_token);
};

export const getAccessToken = (): string | null => {
  return localStorage.getItem('access_token');
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refresh_token');
};

export const clearAuthTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

export const isAuthenticated = (): boolean => {
  return !!getAccessToken();
};
