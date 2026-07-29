"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "@/src/store/auth-store";
import { getInstallationId } from "@/src/lib/device/installation";
import { LayoutDashboard, LogIn, KeyRound, ShieldCheck, Users, MonitorCog, Activity, TerminalSquare, Settings, LogOut, Home } from "lucide-react";

const links = [
  ["/", "Home", Home],
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/dashboard/admin", "Admin Dashboard", Users],
  ["/dashboard/teacher", "Teacher Dashboard", LayoutDashboard],
  ["/dashboard/student", "Student Dashboard", LayoutDashboard],
  ["/sessions", "Sessions", MonitorCog],
  ["/activities", "Activities", Activity],
  ["/api-console", "API Console", TerminalSquare],
  ["/settings/device", "Device Settings", Settings]
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { accessToken, hydrate, clearAuth } = useAuthStore();
  const isLandingPage = pathname === '/';
  
  // Public auth routes should not show sidebar
  const isPublicAuthRoute = 
    pathname === '/login' ||
    pathname.startsWith('/auth/login') ||
    pathname.startsWith('/auth/first-access') ||
    pathname.startsWith('/auth/password-reset') ||
    pathname.startsWith('/auth/forgot-password') ||
    pathname.startsWith('/auth/device-replacement');
  
  useEffect(() => { hydrate(); getInstallationId(); }, [hydrate]);
  
  if (isLandingPage || isPublicAuthRoute) {
    return (
      <div className="min-h-screen">
        <Toaster position="top-right" />
        {children}
      </div>
    );
  }
  
  return (
    <div className="min-h-screen">
      <Toaster position="top-right" />
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-800 bg-slate-950/95 p-4 lg:block overflow-y-auto">
        <div className="mb-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary-500/10">
              <Home className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-primary-300">Smart QR Attendance</h1>
              <p className="text-xs text-slate-500">Module 1</p>
            </div>
          </Link>
        </div>
        <nav className="space-y-1">
          {links.map(([href, name, Icon]) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link 
                key={href} 
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive 
                    ? 'bg-primary-500/10 text-primary-300' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {name}
              </Link>
            );
          })}
        </nav>
        {accessToken && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            <button 
              className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-danger-400 transition-colors"
              onClick={clearAuth}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </aside>
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur lg:ml-72">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className={`badge ${accessToken ? 'badge-success' : 'badge-warning'}`}>
              {accessToken ? 'Authenticated' : 'Anonymous'}
            </span>
            {accessToken && (
              <span className="text-xs text-slate-500">Session Active</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/api-console" className="btn-ghost text-xs">
              <TerminalSquare className="h-4 w-4" />
              API Console
            </Link>
          </div>
        </div>
      </header>
      <main className="p-5 lg:ml-72 lg:p-8">{children}</main>
    </div>
  );
}
