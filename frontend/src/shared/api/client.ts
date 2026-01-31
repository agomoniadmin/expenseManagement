import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { AuthResponse, RefreshTokenRequest } from '@/shared/types/api';

const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token (skip for refresh endpoint to avoid sending expired token)
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const isRefresh = config.url?.includes('/auth/refresh');
  const token = getStoredToken();
  if (token && config.headers && !isRefresh) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token refresh on 401
let refreshPromise: Promise<AuthResponse> | null = null;

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequest | undefined;
    const status = error.response?.status;
    if (
      (status === 401 || status === 403) &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/')
    ) {
      originalRequest._retry = true;

      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (!refreshPromise) {
        refreshPromise = api
          .post<AuthResponse>('/auth/refresh', {
            refreshToken,
          } satisfies RefreshTokenRequest)
          .then((res) => res.data)
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        const data = await refreshPromise;
        storeTokens(data.accessToken, data.refreshToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        }
        return api(originalRequest);
      } catch {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
