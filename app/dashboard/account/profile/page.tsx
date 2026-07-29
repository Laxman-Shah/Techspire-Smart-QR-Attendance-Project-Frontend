"use client";
import { useAuthStore } from "@/src/store/auth-store";
import { AuthGuard } from "@/src/components/auth-guard";
import { User, Mail, Phone, Shield, Calendar, BadgeCheck, Clock, Fingerprint } from "lucide-react";

function ProfileContent() {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-400">User information not available</p>
      </div>
    );
  }

  const userData = user as any;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-slate-400 text-sm">View your account information</p>
      </div>

      {/* Profile Card */}
      <div className="card p-6">
        <div className="flex items-start gap-6 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <User className="h-10 w-10 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{userData.fullName || userData.username || "User"}</h2>
            <p className="text-slate-400 text-sm">@{userData.username}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`badge ${userData.accountStatus === "Active" ? "badge-success" : "badge-warning"} text-xs`}>
                {userData.accountStatus || "Unknown"}
              </span>
              {userData.emailVerified && (
                <span className="badge badge-info text-xs flex items-center gap-1">
                  <BadgeCheck className="h-3 w-3" />
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* User Details */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User ID */}
            <div className="card p-4 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                  <Fingerprint className="h-5 w-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">User ID</p>
                  <p className="font-mono text-sm">{userData.userId || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Username */}
            <div className="card p-4 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Username</p>
                  <p className="font-medium">{userData.username || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="card p-4 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Email</p>
                  <p className="font-medium text-sm">{userData.email || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Phone Number */}
            <div className="card p-4 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Phone Number</p>
                  <p className="font-medium">{userData.phoneNumber || "Not provided"}</p>
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div className="card p-4 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Account Status</p>
                  <p className={`font-medium ${userData.accountStatus === "Active" ? "text-success-400" : "text-warning-400"}`}>
                    {userData.accountStatus || "Unknown"}
                  </p>
                </div>
              </div>
            </div>

            {/* Email Verification */}
            <div className="card p-4 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                  <BadgeCheck className="h-5 w-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Email Verification</p>
                  <p className={`font-medium ${userData.emailVerified ? "text-success-400" : "text-warning-400"}`}>
                    {userData.emailVerified ? "Verified" : "Not Verified"}
                  </p>
                </div>
              </div>
            </div>

            {/* Created At */}
            <div className="card p-4 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Account Created</p>
                  <p className="font-medium text-sm">
                    {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Last Login */}
            <div className="card p-4 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Last Login</p>
                  <p className="font-medium text-sm">
                    {userData.lastLoginAt ? new Date(userData.lastLoginAt).toLocaleString() : "Never"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Roles */}
          {userData.roles && Array.isArray(userData.roles) && userData.roles.length > 0 && (
            <div className="card p-4 bg-slate-800/50">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Roles</p>
              <div className="flex flex-wrap gap-2">
                {userData.roles.map((role: string, index: number) => (
                  <span key={index} className="badge badge-info">
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard allowedRoles={["ADMIN", "TEACHER", "STUDENT"]}>
      <ProfileContent />
    </AuthGuard>
  );
}
