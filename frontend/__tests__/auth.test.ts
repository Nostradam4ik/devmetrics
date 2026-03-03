import { describe, it, expect, beforeEach } from 'vitest';
import {
  setAuthTokens,
  getAccessToken,
  getRefreshToken,
  clearAuthTokens,
  isAuthenticated,
  type AuthTokens,
} from '@/lib/auth';

const SAMPLE_TOKENS: AuthTokens = {
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.access',
  refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.refresh',
  token_type: 'bearer',
};

// jsdom provides localStorage
beforeEach(() => {
  localStorage.clear();
});

describe('setAuthTokens', () => {
  it('stores access and refresh tokens', () => {
    setAuthTokens(SAMPLE_TOKENS);
    expect(localStorage.getItem('access_token')).toBe(SAMPLE_TOKENS.access_token);
    expect(localStorage.getItem('refresh_token')).toBe(SAMPLE_TOKENS.refresh_token);
  });
});

describe('getAccessToken', () => {
  it('returns null when no token stored', () => {
    expect(getAccessToken()).toBeNull();
  });

  it('returns the stored access token', () => {
    setAuthTokens(SAMPLE_TOKENS);
    expect(getAccessToken()).toBe(SAMPLE_TOKENS.access_token);
  });
});

describe('getRefreshToken', () => {
  it('returns null when no token stored', () => {
    expect(getRefreshToken()).toBeNull();
  });

  it('returns the stored refresh token', () => {
    setAuthTokens(SAMPLE_TOKENS);
    expect(getRefreshToken()).toBe(SAMPLE_TOKENS.refresh_token);
  });
});

describe('clearAuthTokens', () => {
  it('removes both tokens', () => {
    setAuthTokens(SAMPLE_TOKENS);
    clearAuthTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('does not throw when tokens are already absent', () => {
    expect(() => clearAuthTokens()).not.toThrow();
  });
});

describe('isAuthenticated', () => {
  it('returns false when no token', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('returns true when access token is set', () => {
    setAuthTokens(SAMPLE_TOKENS);
    expect(isAuthenticated()).toBe(true);
  });

  it('returns false after clearing tokens', () => {
    setAuthTokens(SAMPLE_TOKENS);
    clearAuthTokens();
    expect(isAuthenticated()).toBe(false);
  });
});
