"use client";
import { create } from "zustand";
import { extractRolesFromToken, isTokenExpired as checkTokenExpired } from "@/src/lib/jwt/decoder";
import type { RoleName } from "@/src/types/api";

interface AuthState {
  accessToken: string;
  expiresAt?: string;
  user?: unknown;
  roles?: string[];
  lastResponse?: unknown;
  isInitializing: boolean;
  hasInitialized: boolean;
  refreshFailed: boolean;
  isLoggingOut: boolean;
  lastSessionRestoreAttempt?: number;
  setAccessToken: (token: string, expiresAt?: string) => void;
  setUser: (user: unknown) => void;
  setRoles: (roles: string[]) => void;
  setLastResponse: (response: unknown) => void;
  setInitializing: (isInitializing: boolean) => void;
  setHasInitialized: (hasInitialized: boolean) => void;
  setRefreshFailed: (refreshFailed: boolean) => void;
  setLoggingOut: (isLoggingOut: boolean) => void;
  setAuthenticatedSession: (response: unknown) => void;
  clearAuth: () => void;
  clearAuthForLogout: () => void;
  hydrate: () => void;
  isAuthenticated: () => boolean;
  hasRole: (role: string) => boolean;
  getPrimaryRole: () => RoleName | null;
  isTokenExpired: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: "",
  isInitializing: false,
  hasInitialized: false,
  refreshFailed: false,
  isLoggingOut: false,
  setAccessToken: (token, expiresAt) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("smart_qr_access_token", token);
      if (expiresAt) localStorage.setItem("smart_qr_access_expires", expiresAt);
      // Extract roles from token and store them
      const roles = extractRolesFromToken(token);
      if (roles.length > 0) {
        localStorage.setItem("smart_qr_roles", JSON.stringify(roles));
      }
    }
    
    // Development debug logging
    if (process.env.NODE_ENV === "development") {
      console.log("[AUTH] setAccessToken called: token exists =", Boolean(token));
    }
    
    set({ 
      accessToken: token, 
      expiresAt,
      roles: extractRolesFromToken(token),
      refreshFailed: false // Reset refresh failed flag when new token is set
    });
  },
  setUser: (user) => {
    if (typeof window !== "undefined" && user) {
      localStorage.setItem("smart_qr_user", JSON.stringify(user));
    }
    
    // Development debug logging
    if (process.env.NODE_ENV === "development") {
      console.log("[AUTH] setUser called: user exists =", Boolean(user));
    }
    
    set({ user });
  },
  setRoles: (roles) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("smart_qr_roles", JSON.stringify(roles));
    }
    set({ roles });
  },
  setLastResponse: (response) => set({ lastResponse: response }),
  setInitializing: (isInitializing) => set({ isInitializing }),
  setHasInitialized: (hasInitialized) => set({ hasInitialized }),
  setRefreshFailed: (refreshFailed) => set({ refreshFailed }),
  setLoggingOut: (isLoggingOut) => set({ isLoggingOut }),
  setAuthenticatedSession: (response) => {
    const tokenInfo = extractAccessToken(response);
    if (tokenInfo.token) {
      get().setAccessToken(tokenInfo.token, tokenInfo.expiresAt);
      if (tokenInfo.user) {
        get().setUser(tokenInfo.user);
      }
    }
  },
  clearAuth: () => {
    if (typeof window !== "undefined") {
      // Remove all auth-related localStorage items
      localStorage.removeItem("smart_qr_access_token");
      localStorage.removeItem("smart_qr_access_expires");
      localStorage.removeItem("smart_qr_roles");
      localStorage.removeItem("smart_qr_user");
      // Also remove any Zustand persist storage if it exists
      localStorage.removeItem("auth-storage");
      // NOTE: Do NOT remove smart_qr_logout_timestamp - it prevents refresh loop after logout
      // NOTE: Do NOT remove smart_qr_installation_id - device binding depends on it
    }
    set({
      accessToken: "",
      expiresAt: undefined,
      user: undefined,
      roles: undefined,
      lastResponse: undefined,
      hasInitialized: true,
      refreshFailed: false,
      isInitializing: false,
      isLoggingOut: false
    });
  },
  clearAuthForLogout: () => {
    if (typeof window !== "undefined") {
      // Remove all auth-related localStorage items immediately
      localStorage.removeItem("smart_qr_access_token");
      localStorage.removeItem("smart_qr_access_expires");
      localStorage.removeItem("smart_qr_roles");
      localStorage.removeItem("smart_qr_user");
      // Remove any Zustand persist storage
      localStorage.removeItem("auth-storage");
      localStorage.removeItem("auth-store");
      localStorage.removeItem("smart-auth");
      // Clear sessionStorage as well
      sessionStorage.removeItem("auth-storage");
      sessionStorage.removeItem("auth-store");
      sessionStorage.removeItem("smart-auth");
      // NOTE: Do NOT remove smart_qr_installation_id - device binding depends on it
    }
    set({
      accessToken: "",
      expiresAt: undefined,
      user: undefined,
      roles: undefined,
      lastResponse: undefined,
      hasInitialized: true,
      refreshFailed: true,
      isInitializing: false,
      isLoggingOut: true
    });
  },
  hydrate: () => {
    if (typeof window === "undefined") return;
    const rolesStr = localStorage.getItem("smart_qr_roles");
    const userStr = localStorage.getItem("smart_qr_user");
    set({
      accessToken: localStorage.getItem("smart_qr_access_token") || "",
      expiresAt: localStorage.getItem("smart_qr_access_expires") || undefined,
      roles: rolesStr ? JSON.parse(rolesStr) : undefined,
      user: userStr ? JSON.parse(userStr) : undefined
    });
  },
  isAuthenticated: () => {
    const { accessToken } = get();
    return !!accessToken && !get().isTokenExpired();
  },
  hasRole: (role: string) => {
    const { roles } = get();
    return roles?.includes(role) || false;
  },
  getPrimaryRole: () => {
    const { roles } = get();
    if (!roles || roles.length === 0) return null;
    // Return the first role as primary
    const role = roles[0];
    if (role === "ADMIN" || role === "STUDENT" || role === "TEACHER") {
      return role as RoleName;
    }
    return null;
  },
  isTokenExpired: () => {
    const { accessToken } = get();
    return checkTokenExpired(accessToken);
  }
}));

// Helper function to normalize roles from various formats
export function normalizeRoles(input: unknown): string[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input
      .map((item: unknown) => {
        if (typeof item === "string") return item;

        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          return (
            obj.role ??
            obj.Role ??
            obj.roleName ??
            obj.RoleName ??
            obj.name ??
            obj.Name ??
            obj.normalizedRoleName ??
            obj.NormalizedRoleName ??
            ""
          );
        }

        return "";
      })
      .filter((role: unknown): role is string => typeof role === "string" && Boolean(role))
      .map((role) => role.toUpperCase());
  }

  if (typeof input === "string") {
    return [input.toUpperCase()];
  }

  return [];
}

// Helper function to extract user from auth response with normalized roles
export function extractUserFromAuthResponse(raw: unknown): any | null {
  if (!raw || typeof raw !== "object") return null;

  const obj = raw as Record<string, any>;

  const user =
    obj.user ??
    obj.User ??
    obj.data?.user ??
    obj.Data?.User ??
    obj.result?.user ??
    obj.Result?.User ??
    null;

  if (!user) return null;

  const roles = normalizeRoles(
    user.roles ??
    user.Roles ??
    user.role ??
    user.Role ??
    obj.roles ??
    obj.Roles
  );

  return {
    userId: user.userId ?? user.UserId,
    username: user.username ?? user.Username,
    email: user.email ?? user.Email,
    fullName: user.fullName ?? user.FullName,
    accountStatus: user.accountStatus ?? user.AccountStatus,
    emailVerified: user.emailVerified ?? user.EmailVerified,
    roles,
  };
}

// Helper function to extract access token from various response formats
function extractAccessToken(data: any): { token?: string; expiresAt?: string; user?: unknown } {
  if (!data || typeof data !== "object") return {};
  const token = 
    data.AccessToken || 
    data.accessToken || 
    data.Token?.AccessToken || 
    data.tokens?.accessToken ||
    data.data?.AccessToken ||
    data.data?.accessToken ||
    data.data?.tokens?.accessToken ||
    data.result?.AccessToken ||
    data.result?.accessToken ||
    data.result?.tokens?.accessToken;
  const expiresAt = 
    data.ExpiresAtUtc || 
    data.expiresAtUtc || 
    data.Token?.ExpiresAtUtc || 
    data.tokens?.expiresAtUtc ||
    data.data?.ExpiresAtUtc ||
    data.data?.expiresAtUtc ||
    data.result?.ExpiresAtUtc ||
    data.result?.expiresAtUtc;
  const user = 
    data.User || 
    data.user ||
    data.data?.User ||
    data.data?.user ||
    data.result?.User ||
    data.result?.user;
  return { token, expiresAt, user };
}
