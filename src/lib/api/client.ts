import axios, { AxiosError, Method, InternalAxiosRequestConfig } from "axios";
import { getBrowserFingerprint, getInstallationId } from "@/src/lib/device/installation";
import { useAuthStore } from "@/src/store/auth-store";
import { refreshAccessTokenOnce } from "@/src/lib/auth/refresh";
import type { ApiResult } from "@/src/types/api";
import toast from "react-hot-toast";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5082";

// Helper to extract pathname from URL
function getPathname(configUrl: string): string {
  try {
    return new URL(configUrl, API_BASE_URL).pathname;
  } catch {
    return configUrl.split("?")[0];
  }
}

// Set of public auth endpoints that should NOT require Authorization header
const PUBLIC_AUTH_ENDPOINTS = new Set([
  "/api/auth/login",
  "/api/auth/login/verify-otp",
  "/api/auth/login/complete",
  "/api/auth/login/resend-otp",
  "/api/auth/first-access",
  "/api/auth/first-access/verify-otp",
  "/api/auth/first-access/complete",
  "/api/auth/refresh-token",
  "/api/auth/refresh-token/logout",
  "/api/auth/forgot-password",
  "/api/auth/password-reset/verify-otp",
  "/api/auth/password-reset/resend-otp",
  "/api/auth/reset-password",
  "/api/auth/device-replacement/start",
  "/api/auth/device-replacement/verify-otp",
  "/api/auth/device-replacement/resend-otp",
]);

// Check if a URL is a public auth endpoint using exact pathname matching
function isPublicAuthPath(configUrl: string): boolean {
  const pathname = getPathname(configUrl);
  return PUBLIC_AUTH_ENDPOINTS.has(pathname);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    config.headers.set("X-Installation-Id", getInstallationId());
    const fp = getBrowserFingerprint();
    if (fp) config.headers.set("X-Browser-Fingerprint", fp);
    
    // Use exact pathname matching to determine if endpoint is public
    const pathname = getPathname(config.url || "");
    const isPublicAuthEndpoint = isPublicAuthPath(config.url || "");
    
    // Development debug logging for login-activities endpoint
    if (process.env.NODE_ENV === "development" && pathname === "/api/auth/login-activities") {
      const token = useAuthStore.getState().accessToken;
      console.log("[LOGIN-ACTIVITIES DEBUG] isPublic:", isPublicAuthEndpoint);
      console.log("[LOGIN-ACTIVITIES DEBUG] hasToken:", Boolean(token));
    }
    
    if (!isPublicAuthEndpoint) {
      // Always read latest token from Zustand store, not localStorage
      const token = useAuthStore.getState().accessToken;
      
      // Development debug logging
      if (process.env.NODE_ENV === "development") {
        console.log(`[API] Request to ${pathname}: token exists = ${Boolean(token)}`);
      }
      
      if (token) {
        config.headers.set("Authorization", `Bearer ${token}`);
      }
    }
  }
  return config;
});

// Response interceptor to handle 401 and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      const url = originalRequest.url || '';
      
      // Skip refresh for public auth endpoints - let them handle their own errors
      const isPublicAuthEndpoint = isPublicAuthPath(url);
      const isLogoutEndpoint = url.includes('/logout');
      
      // Check if refresh has already failed or user is logging out
      const { refreshFailed, setRefreshFailed, clearAuth, isLoggingOut } = useAuthStore.getState();
      
      // For public auth endpoints, logout, or if refresh already failed, just reject the error
      // Do NOT clear auth or redirect - let the page handle the error
      if (isPublicAuthEndpoint || isLogoutEndpoint || refreshFailed || isLoggingOut) {
        console.log('[API] Skipping refresh for endpoint:', url, 'isPublicAuth:', isPublicAuthEndpoint, 'isLogout:', isLogoutEndpoint, 'refreshFailed:', refreshFailed, 'isLoggingOut:', isLoggingOut);
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      // Use centralized refresh function with built-in lock
      const refreshed = await refreshAccessTokenOnce();

      if (refreshed) {
        // Refresh succeeded, retry original request with new token
        const latestToken = useAuthStore.getState().accessToken;
        if (latestToken) {
          originalRequest.headers.Authorization = `Bearer ${latestToken}`;
          return api(originalRequest);
        }
      }
      
      // Refresh failed or no token available, clear auth and redirect
      clearAuth();
      setRefreshFailed(true);
      if (typeof window !== "undefined") {
        toast.error("Your session has expired. Please sign in again.");
        window.location.href = '/login';
      }
      
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

export async function request<T = unknown>(method: Method, url: string, data?: unknown, params?: Record<string, unknown>): Promise<ApiResult<T>> {
  try {
    const res = await api.request<T>({ method, url, data, params });
    return { ok: true, status: res.status, data: res.data, raw: res.data, headers: Object.fromEntries(Object.entries(res.headers).map(([k, v]) => [k, String(v)])) };
  } catch (error) {
    const err = error as AxiosError;
    const raw = err.response?.data || { message: err.message };
    return { 
      ok: false, 
      status: err.response?.status || 0, 
      error: raw, 
      raw,
      headers: Object.fromEntries(
        Object.entries(err.response?.headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)])
      )
    };
  }
}

export function extractAccessToken(data: any): { token?: string; expiresAt?: string; user?: unknown } {
  if (!data || typeof data !== "object") return {};
  
  const token = 
    data.AccessToken || 
    data.accessToken || 
    data.Token?.AccessToken || 
    data.Tokens?.AccessToken ||
    data.tokens?.accessToken ||
    data.tokens?.AccessToken ||
    data.data?.AccessToken ||
    data.data?.accessToken ||
    data.data?.Token?.AccessToken ||
    data.data?.Tokens?.AccessToken ||
    data.data?.tokens?.accessToken ||
    data.data?.tokens?.AccessToken ||
    data.result?.AccessToken ||
    data.result?.accessToken ||
    data.result?.Token?.AccessToken ||
    data.result?.Tokens?.AccessToken ||
    data.result?.tokens?.accessToken ||
    data.result?.tokens?.AccessToken;
  
  const expiresAt = 
    data.ExpiresAtUtc || 
    data.expiresAtUtc || 
    data.accessTokenExpiresAtUtc ||
    data.AccessTokenExpiresAtUtc ||
    data.Token?.ExpiresAtUtc || 
    data.Tokens?.ExpiresAtUtc ||
    data.Tokens?.AccessTokenExpiresAtUtc ||
    data.tokens?.expiresAtUtc ||
    data.tokens?.ExpiresAtUtc ||
    data.tokens?.accessTokenExpiresAtUtc ||
    data.tokens?.AccessTokenExpiresAtUtc ||
    data.data?.ExpiresAtUtc ||
    data.data?.expiresAtUtc ||
    data.data?.accessTokenExpiresAtUtc ||
    data.data?.AccessTokenExpiresAtUtc ||
    data.data?.Token?.ExpiresAtUtc ||
    data.data?.Tokens?.ExpiresAtUtc ||
    data.data?.Tokens?.AccessTokenExpiresAtUtc ||
    data.data?.tokens?.expiresAtUtc ||
    data.data?.tokens?.ExpiresAtUtc ||
    data.data?.tokens?.accessTokenExpiresAtUtc ||
    data.data?.tokens?.AccessTokenExpiresAtUtc ||
    data.result?.ExpiresAtUtc ||
    data.result?.expiresAtUtc ||
    data.result?.accessTokenExpiresAtUtc ||
    data.result?.AccessTokenExpiresAtUtc ||
    data.result?.Token?.ExpiresAtUtc ||
    data.result?.Tokens?.ExpiresAtUtc ||
    data.result?.Tokens?.AccessTokenExpiresAtUtc ||
    data.result?.tokens?.expiresAtUtc ||
    data.result?.tokens?.ExpiresAtUtc ||
    data.result?.tokens?.accessTokenExpiresAtUtc ||
    data.result?.tokens?.AccessTokenExpiresAtUtc;
  
  const user = 
    data.User || 
    data.user ||
    data.data?.User ||
    data.data?.user ||
    data.result?.User ||
    data.result?.user;
  
  return { token, expiresAt, user };
}
