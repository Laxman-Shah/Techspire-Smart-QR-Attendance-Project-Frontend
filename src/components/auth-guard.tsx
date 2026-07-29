"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/src/store/auth-store";
import type { RoleName } from "@/src/types/api";
import { FullPageLoading } from "./full-page-loading";
import toast from "react-hot-toast";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: RoleName[];
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, allowedRoles, fallback }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, isInitializing, hasInitialized, isAuthenticated, getPrimaryRole, isLoggingOut, clearAuth } = useAuthStore();
  const [initStartTime] = useState(Date.now());

  useEffect(() => {
    // If user is logging out, don't run any auth checks
    if (isLoggingOut) {
      return;
    }

    // Wait for auth initialization to complete before making decisions
    if (isInitializing || !hasInitialized) {
      // Add timeout safety: if initialization takes more than 8 seconds, force stop
      const timeoutId = setTimeout(() => {
        if (isInitializing) {
          console.error('[AUTH_GUARD] Initialization timeout after 8 seconds');
          clearAuth();
          toast.error('Session check took too long. Please sign in again.');
          router.push('/login');
        }
      }, 8000);

      return () => clearTimeout(timeoutId);
    }

    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    if (allowedRoles && allowedRoles.length > 0) {
      const userRole = getPrimaryRole();
      if (!userRole || !allowedRoles.includes(userRole)) {
        // User doesn't have required role, redirect to appropriate dashboard
        // But only if not already on a valid dashboard route for their role
        const isOnValidDashboard = 
          (userRole === "ADMIN" && pathname.startsWith("/dashboard/admin")) ||
          (userRole === "TEACHER" && pathname.startsWith("/dashboard/teacher")) ||
          (userRole === "STUDENT" && pathname.startsWith("/dashboard/student"));
        
        if (!isOnValidDashboard) {
          if (userRole === "ADMIN") {
            router.push("/dashboard/admin");
          } else if (userRole === "TEACHER") {
            router.push("/dashboard/teacher");
          } else if (userRole === "STUDENT") {
            router.push("/dashboard/student");
          } else {
            router.push("/dashboard");
          }
        }
      }
    }
  }, [isInitializing, hasInitialized, isAuthenticated, allowedRoles, getPrimaryRole, router, pathname, isLoggingOut, clearAuth]);

  // If user is logging out, don't show anything - let redirect happen
  if (isLoggingOut) {
    return null;
  }

  // Show loading state while initializing (with timeout safety)
  if (isInitializing || !hasInitialized) {
    const elapsed = Date.now() - initStartTime;
    if (elapsed > 8000) {
      // Timeout exceeded - this should be caught by useEffect, but render fallback
      return null;
    }
    return <FullPageLoading message="Verifying your session..." />;
  }

  // Show redirecting if not authenticated
  if (!isAuthenticated()) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = getPrimaryRole();
    if (!userRole || !allowedRoles.includes(userRole)) {
      return fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="card p-8 text-center max-w-md">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-slate-400 mb-4">
              You don't have permission to access this page.
            </p>
            <div className="space-y-2">
              {userRole === "ADMIN" && (
                <button onClick={() => router.push("/dashboard/admin")} className="btn w-full">
                  Go to Admin Dashboard
                </button>
              )}
              {userRole === "TEACHER" && (
                <button onClick={() => router.push("/dashboard/teacher")} className="btn w-full">
                  Go to Teacher Dashboard
                </button>
              )}
              {userRole === "STUDENT" && (
                <button onClick={() => router.push("/dashboard/student")} className="btn w-full">
                  Go to Student Dashboard
                </button>
              )}
              <button onClick={() => router.push("/dashboard")} className="btn-secondary w-full">
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
