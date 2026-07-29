import { authApi } from "@/src/lib/api/auth";
import { useAuthStore } from "@/src/store/auth-store";

interface Router {
  replace: (path: string) => void;
}

/**
 * Central logout helper that handles all logout logic:
 * 1. Sets isLoggingOut flag FIRST to prevent any refresh attempts
 * 2. Immediately clears frontend auth state using clearAuthForLogout
 * 3. Removes all persisted auth from localStorage/sessionStorage
 * 4. Calls backend logout API (prefers public refresh-token/logout)
 * 5. Redirects to login page using router.replace
 * 
 * This ensures no refresh-token calls happen after logout and all auth state is cleaned up immediately.
 */
export async function logoutAndRedirect(router: Router): Promise<void> {
  const store = useAuthStore.getState();
  
  // Prevent duplicate logout calls
  if (store.isLoggingOut) {
    console.log('[LOGOUT] Already logging out, skipping duplicate call');
    return;
  }
  
  // Set logging out flag IMMEDIATELY before any other operation
  store.setLoggingOut(true);
  
  // Clear frontend auth state IMMEDIATELY so UI stops thinking session is active
  // This prevents "Checking your session" from showing after logout
  store.clearAuthForLogout();
  
  // Remove persisted auth immediately
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth-storage");
    localStorage.removeItem("auth-store");
    localStorage.removeItem("smart-auth");
    sessionStorage.removeItem("auth-storage");
    sessionStorage.removeItem("auth-store");
    sessionStorage.removeItem("smart-auth");
  }
  
  try {
    // Try backend logout after frontend state is already cleared
    // Use refresh-token/logout because it can work even if access token is gone
    console.log('[LOGOUT] Calling backend refresh-token/logout');
    await authApi.refreshTokenLogout();
  } catch (error) {
    // Ignore backend logout failure - user must still be logged out locally
    console.error('[LOGOUT] Backend logout failed (this is OK, continuing with redirect):', error);
  } finally {
    // Use router.replace for redirect (no full page reload needed)
    router.replace("/login");
  }
}

