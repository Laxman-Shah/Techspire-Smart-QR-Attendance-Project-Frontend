"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "@/src/store/auth-store";
import { logoutAndRedirect } from "@/src/lib/auth/logout";
import { 
  LayoutDashboard, 
  LogOut, 
  Users, 
  MonitorCog, 
  Activity, 
  ShieldCheck, 
  Smartphone,
  UserPlus,
  Menu,
  X,
  Home,
  User
} from "lucide-react";
import type { RoleName } from "@/src/types/api";

interface SidebarItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles: RoleName[];
}

const sidebarItems: SidebarItem[] = [
  {
    href: "/dashboard/admin",
    label: "Admin Overview",
    icon: <LayoutDashboard className="h-4 w-4" />,
    allowedRoles: ["ADMIN"]
  },
  {
    href: "/dashboard/admin/register-user",
    label: "Register User",
    icon: <UserPlus className="h-4 w-4" />,
    allowedRoles: ["ADMIN"]
  },
  {
    href: "/dashboard/admin/users",
    label: "Users",
    icon: <Users className="h-4 w-4" />,
    allowedRoles: ["ADMIN"]
  },
  {
    href: "/dashboard/admin/device-management",
    label: "Device Management",
    icon: <Smartphone className="h-4 w-4" />,
    allowedRoles: ["ADMIN"]
  },
  {
    href: "/dashboard/admin/sessions",
    label: "Sessions",
    icon: <MonitorCog className="h-4 w-4" />,
    allowedRoles: ["ADMIN"]
  },
  {
    href: "/dashboard/admin/activities",
    label: "Login Activities",
    icon: <Activity className="h-4 w-4" />,
    allowedRoles: ["ADMIN"]
  },
  {
    href: "/dashboard/teacher",
    label: "Teacher Overview",
    icon: <LayoutDashboard className="h-4 w-4" />,
    allowedRoles: ["TEACHER"]
  },
  {
    href: "/dashboard/teacher/sessions",
    label: "Sessions",
    icon: <MonitorCog className="h-4 w-4" />,
    allowedRoles: ["TEACHER"]
  },
  {
    href: "/dashboard/teacher/activities",
    label: "Login Activities",
    icon: <Activity className="h-4 w-4" />,
    allowedRoles: ["TEACHER"]
  },
  {
    href: "/dashboard/student",
    label: "Student Overview",
    icon: <LayoutDashboard className="h-4 w-4" />,
    allowedRoles: ["STUDENT"]
  },
  {
    href: "/dashboard/profile",
    label: "User Profile",
    icon: <User className="h-4 w-4" />,
    allowedRoles: ["ADMIN", "TEACHER", "STUDENT"]
  },
  {
    href: "/dashboard/account/security",
    label: "Account Security",
    icon: <ShieldCheck className="h-4 w-4" />,
    allowedRoles: ["ADMIN", "TEACHER", "STUDENT"]
  }
];

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { accessToken, clearAuth, getPrimaryRole } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const userRole = getPrimaryRole();

  // Public auth routes should not show sidebar
  const isPublicAuthRoute = 
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/auth/login') ||
    pathname.startsWith('/auth/first-access') ||
    pathname.startsWith('/auth/password-reset') ||
    pathname.startsWith('/auth/forgot-password') ||
    pathname.startsWith('/auth/device-replacement') ||
    pathname === '/api-console';

  if (isPublicAuthRoute) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Toaster position="top-right" />
        {children}
      </div>
    );
  }

  // Filter sidebar items based on user role
  const filteredItems = sidebarItems.filter(item => 
    userRole && item.allowedRoles.includes(userRole)
  );

  const handleLogout = async () => {
    await logoutAndRedirect(router);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Toaster position="top-right" />
      
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary-500/10">
              <Home className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-primary-300">Smart QR Attendance</h1>
              <p className="text-xs text-slate-500">Module 1</p>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-slate-950/95 backdrop-blur pt-16 px-4 py-6 overflow-y-auto">
          <nav className="space-y-2">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors ${
                    isActive
                      ? 'bg-primary-500/10 text-primary-300'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full rounded-lg px-4 py-3 text-sm text-slate-400 hover:bg-slate-800 hover:text-danger-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
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
        
        {userRole && (
          <div className="mb-4">
            <span className="badge badge-info text-xs">
              {userRole}
            </span>
          </div>
        )}
        
        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-500/10 text-primary-300'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        {accessToken && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-danger-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </aside>

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur lg:ml-72 pt-16 lg:pt-0">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            {userRole && <span className="badge badge-info">{userRole}</span>}
            <span className="text-xs text-slate-500">
              {accessToken ? 'Session Active' : 'Anonymous'}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-5 lg:ml-72 lg:p-8">{children}</main>
    </div>
  );
}
