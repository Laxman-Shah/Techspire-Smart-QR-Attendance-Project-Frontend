"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, MonitorCog, Activity, CheckCircle, Clock, User, Users } from "lucide-react";
import { useAuthStore } from "@/src/store/auth-store";
import { AuthGuard } from "@/src/components/auth-guard";
import { FullPageLoading } from "@/src/components/full-page-loading";

function TeacherDashboardContent() {
  const router = useRouter();
  const { getPrimaryRole } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <p className="text-slate-400 text-sm">Welcome to your teacher portal</p>
      </div>

      {/* Account Status Cards */}
      <div className="grid-responsive">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-success-500/10 text-success-400">
              <CheckCircle className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Account Status</h3>
          </div>
          <p className="text-2xl font-bold text-success-400 mb-1">Active</p>
          <p className="text-sm text-slate-400">Your account is in good standing</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-success-500/10 text-success-400">
              <CheckCircle className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Email Verified</h3>
          </div>
          <p className="text-2xl font-bold text-success-400 mb-1">Verified</p>
          <p className="text-sm text-slate-400">Your email has been verified</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Last Login</h3>
          </div>
          <p className="text-2xl font-bold text-slate-200 mb-1">Today</p>
          <p className="text-sm text-slate-400">Last login was recent</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Role</h3>
          </div>
          <p className="text-2xl font-bold text-primary-400 mb-1">TEACHER</p>
          <p className="text-sm text-slate-400">Teacher access level</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/dashboard/profile" className="card p-4 text-left hover:border-primary-500/50 transition-colors">
            <User className="h-5 w-5 text-primary-400 mb-2" />
            <h3 className="font-medium mb-1">User Profile</h3>
            <p className="text-xs text-slate-400">View your account and session information</p>
          </Link>
          <Link href="/dashboard/account/security" className="card p-4 text-left hover:border-primary-500/50 transition-colors">
            <ShieldCheck className="h-5 w-5 text-primary-400 mb-2" />
            <h3 className="font-medium mb-1">Account Security</h3>
            <p className="text-xs text-slate-400">Change password & security settings</p>
          </Link>
        </div>
      </div>

      {/* Info Card */}
      <div className="card p-6 bg-primary-500/5 border-primary-500/20">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary-500/10 text-primary-400">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold mb-2">Teacher Portal</h3>
            <p className="text-sm text-slate-400 mb-3">
              This is your teacher dashboard. More features like class management and attendance monitoring will be available in future modules.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle className="h-4 w-4 text-success-400" />
              <span>Full access to security features</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeacherDashboard() {
  return (
    <AuthGuard allowedRoles={["TEACHER"]}>
      <TeacherDashboardContent />
    </AuthGuard>
  );
}
