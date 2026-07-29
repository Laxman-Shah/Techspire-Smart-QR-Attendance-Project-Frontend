"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/src/store/auth-store";
import { FullPageLoading } from "@/src/components/full-page-loading";

export default function Dashboard() {
  const router = useRouter();
  const { isInitializing, hasInitialized, isAuthenticated, getPrimaryRole } = useAuthStore();

  useEffect(() => {
    // Wait for auth initialization to complete before redirecting
    if (!isInitializing && hasInitialized && !isAuthenticated()) {
      router.push("/login");
    } else if (!isInitializing && hasInitialized && isAuthenticated()) {
      // Redirect based on role
      const role = getPrimaryRole();
      if (role === "ADMIN") {
        router.push("/dashboard/admin");
      } else if (role === "TEACHER") {
        router.push("/dashboard/teacher");
      } else if (role === "STUDENT") {
        router.push("/dashboard/student");
      } else {
        // If no role, redirect to login
        router.push("/login");
      }
    }
  }, [isInitializing, hasInitialized, isAuthenticated, getPrimaryRole, router]);

  // Show loading state while initializing
  if (isInitializing || !hasInitialized) {
    return <FullPageLoading message="Redirecting to your dashboard..." />;
  }

  // Show redirecting if not authenticated
  if (!isAuthenticated()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show loading while redirecting
  return <FullPageLoading message="Redirecting to your dashboard..." />;
}
