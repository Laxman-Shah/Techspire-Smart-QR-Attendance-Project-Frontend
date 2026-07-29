"use client";
import { useEffect, useRef } from "react";
import { initializeAuth } from "@/src/lib/auth/refresh";
import { useAuthStore } from "@/src/store/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;

    // Check if user is logging out - if so, don't initialize auth
    const { isLoggingOut } = useAuthStore.getState();
    if (isLoggingOut) {
      console.log('[AUTH_PROVIDER] Skipping auth initialization - user is logging out');
      return;
    }

    // Skip auth initialization on public routes - no need to restore session there
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      const isPublicRoute = 
        pathname === '/' ||
        pathname === '/login' ||
        pathname.startsWith('/auth/login') ||
        pathname.startsWith('/auth/first-access') ||
        pathname.startsWith('/auth/password-reset') ||
        pathname.startsWith('/auth/forgot-password') ||
        pathname.startsWith('/auth/device-replacement') ||
        pathname === '/api-console';
      
      if (isPublicRoute) {
        console.log('[AUTH_PROVIDER] On public route, skipping auth initialization:', pathname);
        // Mark as initialized so we don't check again
        const { setInitializing, setHasInitialized } = useAuthStore.getState();
        setInitializing(false);
        setHasInitialized(true);
        return;
      }
    }

    initializedRef.current = true;
    void initializeAuth();
  }, []);

  return <>{children}</>;
}
