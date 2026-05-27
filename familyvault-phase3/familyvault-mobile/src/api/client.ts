/**
 * api/client.ts — Axios instance with:
 *   1. Authorization header injection on every request
 *   2. Automatic token refresh on 401 (with retry)
 *   3. Logout on refresh failure
 *
 * This is one of the most resume-worthy parts of the mobile app —
 * production apps always handle silent token refresh in the HTTP client.
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { SecureStorage } from '../storage/secureStore';

// ── Config ────────────────────────────────────────────────────────────────────
// Change this to your machine's local IP when testing on a physical device.
// Emulators can reach localhost directly; physical devices need the IP.
export const API_BASE_URL = __DEV__
  ? 'http://localhost:8080'
  : 'https://api.familyvault.com'; // swap for production domain

// ── Axios Instance ────────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Logout callback ───────────────────────────────────────────────────────────
// Injected by AuthContext so the client can trigger a logout without
// creating a circular import (client → context → client).
let onForceLogout: (() => void) | null = null;

export function setForceLogoutHandler(handler: () => void) {
  onForceLogout = handler;
}

// ── Request Interceptor ───────────────────────────────────────────────────────
// Attach the stored access token to every outgoing request.

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response Interceptor ──────────────────────────────────────────────────────
// On 401: silently refresh the access token and replay the failed request.
// If the refresh also fails, force logout — the session is truly expired.

let isRefreshing = false;
// Queue of callbacks waiting for the refresh to finish
let refreshQueue: Array<(newToken: string) => void> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401s that haven't already been retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh if the failing call IS the refresh endpoint
    if (originalRequest.url?.includes('/auth/refresh')) {
      onForceLogout?.();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // If a refresh is already in-flight, queue this request
    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((newToken: string) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshToken = await SecureStorage.getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token stored');

      // Call the refresh endpoint (no auth header needed — it uses the refresh token)
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
        refreshToken,
      });

      const newAccessToken: string = data.accessToken;
      const newRefreshToken: string = data.refreshToken;

      // Persist rotated tokens
      await SecureStorage.saveTokens(newAccessToken, newRefreshToken);

      // Drain the queue
      refreshQueue.forEach((cb) => cb(newAccessToken));
      refreshQueue = [];

      // Replay original request
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh failed → session is fully expired → force logout
      refreshQueue = [];
      await SecureStorage.clearAll();
      onForceLogout?.();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
