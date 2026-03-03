import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

const API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:8001';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

// Errors that are worth retrying (network issues, 5xx server errors)
const isRetryable = (error: AxiosError) => {
  if (!error.response) return true; // network error
  return error.response.status >= 500;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api/v1`,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - attach auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('access_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        // Track retry count on the config object
        (config as InternalAxiosRequestConfig & { _retryCount?: number })
          ._retryCount ??= 0;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - retry + 401 handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as
          | (InternalAxiosRequestConfig & { _retryCount?: number })
          | undefined;

        // 401 → redirect to login
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        // Retry on retryable errors
        if (config && isRetryable(error) && (config._retryCount ?? 0) < MAX_RETRIES) {
          config._retryCount = (config._retryCount ?? 0) + 1;
          await sleep(RETRY_DELAY_MS * config._retryCount);
          return this.client(config);
        }

        return Promise.reject(error);
      }
    );
  }

  getInstance(): AxiosInstance {
    return this.client;
  }
}

const apiClient = new APIClient().getInstance();

export default apiClient;

// Helper to extract a human-readable error message from an Axios error
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data?.detail === 'string') return data.detail;
    if (typeof data?.message === 'string') return data.message;
    if (error.response?.status === 404) return 'Resource not found.';
    if (error.response?.status === 403) return 'Access denied.';
    if (error.response?.status === 429) return 'Too many requests. Please slow down.';
    if (!error.response) return 'Network error. Check your connection.';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}
