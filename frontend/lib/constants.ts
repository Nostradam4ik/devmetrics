export const APP_NAME = 'DevMetrics'
export const APP_DESCRIPTION = 'AI-Powered Developer Analytics Platform'

export const API_ROUTES = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    REFRESH: '/api/v1/auth/refresh',
    ME: '/api/v1/auth/me',
    LOGOUT: '/api/v1/auth/logout',
  },
  OAUTH: {
    GITHUB_AUTHORIZE: '/api/v1/oauth/github/authorize',
    GITHUB_CALLBACK: '/api/v1/oauth/github/callback',
  },
  USERS: {
    ME: '/api/v1/users/me',
    CHANGE_PASSWORD: '/api/v1/users/me/change-password',
  },
} as const
