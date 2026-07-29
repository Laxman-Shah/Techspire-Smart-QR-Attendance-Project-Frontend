import { authApi } from "@/src/lib/api/auth";
import { extractAccessToken } from "@/src/lib/api/client";
import { useAuthStore } from "@/src/store/auth-store";
import { extractUserFromAuthResponse } from "@/src/store/auth-store";
import { isTokenExpired } from "@/src/lib/jwt/decoder";

// Promise-based lock to ensure only one refresh request at a time
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempts to refresh the access token using the refresh token cookie
 * This should be called on app load or when the access token is expired
 * This function ALWAYS calls the backend refresh endpoint to get a fresh token
 */
export async function refreshAccessToken(): Promise<boolean> {
  try {
    // Check if refresh has already failed - don't attempt again
    const { refreshFailed, isLoggingOut } = useAuthStore.getState();
    if (refreshFailed) {
      console.log('[REFRESH] Refresh already failed, skipping attempt');
      return false;
    }

    // Don't attempt refresh if user is logging out
    if (isLoggingOut) {
      console.log('[REFRESH] User is logging out, skipping refresh attempt');
      return false;
    }

    console.log('[REFRESH] Calling refresh token endpoint...');

    // Call refresh token endpoint (uses HttpOnly cookie)
    const res = await authApi.refreshToken();

    console.log('[REFRESH] Response status:', res.status, 'ok:', res.ok);

    if (!res.ok) {
      console.warn('[REFRESH] Refresh token request failed with status:', res.status);
      return false;
    }

    if (!res.raw) {
      console.warn('[REFRESH] Refresh token response has no raw data');
      return false;
    }

    const tokenInfo = extractAccessToken(res.raw);
    console.log('[REFRESH] Extracted token info:', { hasToken: !!tokenInfo.token, hasUser: !!tokenInfo.user, expiresAt: tokenInfo.expiresAt });

    if (!tokenInfo.token) {
      console.error('[REFRESH] Could not extract access token from response');
      return false;
    }

    // Extract user with normalized roles from the full response
    const normalizedUser = extractUserFromAuthResponse(res.raw);
    console.log('[REFRESH] Extracted normalized user:', { hasUser: !!normalizedUser, roles: normalizedUser?.roles });

    const { setAccessToken, setUser, setRefreshFailed } = useAuthStore.getState();
    setAccessToken(tokenInfo.token, tokenInfo.expiresAt);
    setRefreshFailed(false); // Reset refresh failed flag on successful refresh
    
    if (normalizedUser) {
      setUser(normalizedUser);
      console.log('[REFRESH] Normalized user set from refresh response with roles:', normalizedUser.roles);
    } else {
      console.log('[REFRESH] No user in refresh response, will load from token');
    }

    // Debug logs to verify auth store after refresh
    if (process.env.NODE_ENV === "development") {
      const stateAfterRefresh = useAuthStore.getState();
      console.log('[AUTH DEBUG] refresh saved token:', Boolean(stateAfterRefresh.accessToken));
      console.log('[AUTH DEBUG] refresh saved user:', Boolean(stateAfterRefresh.user));
      console.log('[AUTH DEBUG] refresh saved roles:', (stateAfterRefresh.user as any)?.roles);
    }

    console.log('[REFRESH] Refresh token successful, session restored');
    return true;
  } catch (error) {
    console.error('[REFRESH] Failed to refresh access token:', error);
    return false;
  }
}

/**
 * Ensures only one refresh request happens at a time across all callers.
 * Multiple calls to this function will wait for the same ongoing refresh promise.
 */
export async function refreshAccessTokenOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Initializes authentication state on app load
 * 1. Sets initializing state to true
 * 2. Hydrates auth state from localStorage
 * 3. If token exists and is valid, keep it
 * 4. If token is missing or expired, attempt refresh
 * 5. If refresh fails, clear auth state
 * 6. Sets initializing state to false
 */
export async function initializeAuth(): Promise<void> {
  console.log('[INIT] Starting auth initialization...');
  
  // Check if user recently logged out (within last 5 seconds)
  // This prevents refresh attempts immediately after logout
  const logoutTimestamp = localStorage.getItem('smart_qr_logout_timestamp');
  if (logoutTimestamp) {
    const logoutTime = parseInt(logoutTimestamp, 10);
    const timeSinceLogout = Date.now() - logoutTime;
    if (timeSinceLogout < 5000) {
      console.log('[INIT] Skipping auth initialization - logout occurred recently');
      return;
    }
    // Clear old logout timestamp if it's been more than 5 seconds
    localStorage.removeItem('smart_qr_logout_timestamp');
  }
  
  const { hydrate, clearAuth, setInitializing, setHasInitialized, setRefreshFailed } = useAuthStore.getState();
  
  // Set initializing state
  setInitializing(true);
  
  try {
    // Hydrate from localStorage first (may have access token from previous session)
    hydrate();
    
    // Get fresh state after hydration
    const stateAfterHydrate = useAuthStore.getState();
    console.log('[INIT] After hydrate:', { 
      hasToken: !!stateAfterHydrate.accessToken, 
      tokenExpired: stateAfterHydrate.accessToken ? isTokenExpired(stateAfterHydrate.accessToken) : 'N/A',
      hasUser: !!stateAfterHydrate.user,
      refreshFailed: stateAfterHydrate.refreshFailed
    });
    
    // If we have a valid access token after hydration, no need to refresh
    if (stateAfterHydrate.accessToken && !isTokenExpired(stateAfterHydrate.accessToken)) {
      console.log('[INIT] Valid access token restored from localStorage');
      setRefreshFailed(false); // Reset refresh failed flag on successful initialization
      return;
    }
    
    // Token is missing or expired, try to refresh using HttpOnly cookie
    console.log('[INIT] Access token missing or expired. Attempting refresh using refresh token cookie...');
    const refreshed = await refreshAccessTokenOnce();
    
    const finalState = useAuthStore.getState();
    console.log('[INIT] After refresh attempt:', { 
      refreshed, 
      hasToken: !!finalState.accessToken, 
      isAuthenticated: finalState.isAuthenticated(),
      refreshFailed: finalState.refreshFailed
    });
    
    if (refreshed) {
      console.log('[INIT] Session refreshed successfully');
    } else {
      console.log('[INIT] Session refresh failed, clearing auth state');
      clearAuth();
    }
  } catch (error) {
    console.error('[INIT] Auth initialization error:', error);
    clearAuth();
  } finally {
    // Always set initializing to false and hasInitialized to true
    setInitializing(false);
    setHasInitialized(true);
    console.log('[INIT] Auth initialization complete');
  }
}
