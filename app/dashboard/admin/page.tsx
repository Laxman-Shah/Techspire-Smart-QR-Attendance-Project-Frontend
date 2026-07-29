"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Shield, Smartphone, Activity, UserPlus, MonitorCog, Clock, AlertCircle, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/src/store/auth-store";
import { adminApi } from "@/src/lib/api/admin";
import { AuthGuard } from "@/src/components/auth-guard";
import { FullPageLoading } from "@/src/components/full-page-loading";
import type { DashboardSummary } from "@/src/lib/api/admin";

function AdminDashboardContent() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const loadDashboardSummary = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setError(null);
    try {
      const res = await adminApi.getDashboardSummary();
      if (res.ok && res.data) {
        setSummary(res.data);
      } else {
        setError("Failed to load dashboard summary");
      }
    } catch (err) {
      setError("Failed to load dashboard summary");
    } finally {
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    loadDashboardSummary();
  }, []);

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    trend, 
    color = "primary" 
  }: { 
    title: string; 
    value: number | string; 
    icon: React.ReactNode; 
    trend?: string;
    color?: "primary" | "success" | "warning" | "danger";
  }) => {
    const colorClasses = {
      primary: "text-primary-400 bg-primary-500/10",
      success: "text-success-400 bg-success-500/10",
      warning: "text-warning-400 bg-warning-500/10",
      danger: "text-danger-400 bg-danger-500/10"
    };

    return (
      <div className="card p-6 hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
          {trend && (
            <span className="text-xs text-slate-500">{trend}</span>
          )}
        </div>
        <h3 className="text-2xl font-bold mb-1">{value}</h3>
        <p className="text-sm text-slate-400">{title}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm">Overview of system statistics and user management</p>
        </div>
        <Link href="/dashboard/admin/users" className="btn">
          <Users className="h-4 w-4" />
          Manage Users
        </Link>
      </div>

      {error && (
        <div className="card p-4 bg-warning-500/10 border-warning-500/50">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-warning-400" />
            <p className="text-sm text-warning-200">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid-responsive">
        <StatCard
          title="Total Users"
          value={summary?.totalUsers || 0}
          icon={<Users className="h-5 w-5" />}
          trend="+12% from last month"
          color="primary"
        />
        <StatCard
          title="Total Students"
          value={summary?.totalStudents || 0}
          icon={<Users className="h-5 w-5" />}
          color="success"
        />
        <StatCard
          title="Total Teachers"
          value={summary?.totalTeachers || 0}
          icon={<Users className="h-5 w-5" />}
          color="primary"
        />
        <StatCard
          title="Total Admins"
          value={summary?.totalAdmins || 0}
          icon={<Shield className="h-5 w-5" />}
          color="warning"
        />
        <StatCard
          title="Active Users"
          value={summary?.activeUsers || 0}
          icon={<CheckCircle className="h-5 w-5" />}
          trend="Currently online"
          color="success"
        />
        <StatCard
          title="Pending First Access"
          value={summary?.pendingFirstAccessUsers || 0}
          icon={<Clock className="h-5 w-5" />}
          color="warning"
        />
        <StatCard
          title="Device Replacements"
          value={summary?.pendingDeviceReplacementRequests || 0}
          icon={<Smartphone className="h-5 w-5" />}
          color="danger"
        />
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/dashboard/admin/users" className="card p-4 text-left hover:border-primary-500/50 transition-colors">
            <UserPlus className="h-5 w-5 text-primary-400 mb-2" />
            <h3 className="font-medium mb-1">Register User</h3>
            <p className="text-xs text-slate-400">Create new user account</p>
          </Link>
          <Link href="/dashboard/admin/users" className="card p-4 text-left hover:border-primary-500/50 transition-colors">
            <Users className="h-5 w-5 text-primary-400 mb-2" />
            <h3 className="font-medium mb-1">View All Users</h3>
            <p className="text-xs text-slate-400">Manage user accounts</p>
          </Link>
          <Link href="/dashboard/admin/device-replacements" className="card p-4 text-left hover:border-primary-500/50 transition-colors">
            <Smartphone className="h-5 w-5 text-primary-400 mb-2" />
            <h3 className="font-medium mb-1">Device Replacements</h3>
            <p className="text-xs text-slate-400">Manage device requests</p>
          </Link>
          <Link href="/dashboard/admin/sessions" className="card p-4 text-left hover:border-primary-500/50 transition-colors">
            <MonitorCog className="h-5 w-5 text-primary-400 mb-2" />
            <h3 className="font-medium mb-1">Active Sessions</h3>
            <p className="text-xs text-slate-400">View and manage sessions</p>
          </Link>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary-400" />
          Recent Activity
        </h2>
        <div className="text-center py-8">
          <Activity className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Recent activity tracking coming soon</p>
          <Link href="/dashboard/admin/activities" className="btn btn-secondary mt-4 text-sm">
            View All Activities
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AuthGuard allowedRoles={["ADMIN"]}>
      <AdminDashboardContent />
    </AuthGuard>
  );
}
