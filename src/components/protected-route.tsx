"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/src/store/auth-store";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "ADMIN" | "TEACHER" | "STUDENT";
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, requiredRole, fallback }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, hasRole, isInitializing, accessToken } = useAuthStore();

  useEffect(() => {
    // Wait for initialization to complete
    if (isInitializing) {
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    // Check if user has required role
    if (requiredRole && !hasRole(requiredRole)) {
      // Redirect to appropriate dashboard based on role
      const { roles } = useAuthStore.getState();
      if (roles?.includes("ADMIN")) {
        router.push("/dashboard/admin");
      } else if (roles?.includes("TEACHER")) {
        router.push("/dashboard/teacher");
      } else if (roles?.includes("STUDENT")) {
        router.push("/dashboard/student");
      } else {
        router.push("/login");
      }
    }
  }, [isInitializing, accessToken, requiredRole, router, hasRole]);

  // Show loading state during initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show fallback if not authenticated (during redirect)
  if (!isAuthenticated()) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <p className="text-slate-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <p className="text-slate-400">Access denied. Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
