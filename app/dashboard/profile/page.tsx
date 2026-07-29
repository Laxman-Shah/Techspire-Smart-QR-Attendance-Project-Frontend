"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Shield, Clock, Smartphone, Monitor, CheckCircle, XCircle, RefreshCw, LogOut, Fingerprint, Calendar, Globe, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/src/lib/api/auth";
import { useAuthStore } from "@/src/store/auth-store";
import { AuthGuard } from "@/src/components/auth-guard";
import { FullPageLoading } from "@/src/components/full-page-loading";

// Safe value extractor
function getValue(obj: any, ...keys: string[]): any {
  if (!obj || typeof obj !== "object") return null;
  for (const key of keys) {
    if (obj[key] !== undefined) return obj[key];
  }
  return null;
}

// Format date safely
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return "N/A";
  }
}

// Format date only (no time)
function formatDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return "N/A";
  }
}

function ProfileContent() {
  const router = useRouter();
  const { user: authUser, clearAuth } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [pageData, setPageData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const loadData = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setError(null);
    try {
      const res = await authApi.pageLoad();
      if (res.ok && res.data) {
        setPageData(res.data);
      } else {
        setError("Failed to load profile data");
      }
    } catch (err) {
      console.error("Failed to load page data:", err);
      setError("An error occurred while loading profile");
    } finally {
      loadingRef.current = false;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success("Profile refreshed");
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      clearAuth();
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
      clearAuth();
      router.push("/login");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Show error state if page load failed, but still render with auth store data
  if (error) {
    console.warn("Profile page load failed, using auth store data:", error);
  }

  // Extract data with fallback to auth store
  const userData = pageData?.user || authUser;
  const sessionData = pageData?.session || pageData?.Session;
  const deviceData = pageData?.device || pageData?.Device;
  const roles = pageData?.roles || pageData?.Roles || userData?.roles || userData?.Roles || [];

  const userId = getValue(userData, "userId", "UserId") || "N/A";
  const fullName = getValue(userData, "fullName", "FullName") || getValue(userData, "username", "Username") || "User";
  const username = getValue(userData, "username", "Username") || "N/A";
  const email = getValue(userData, "email", "Email") || "N/A";
  const accountStatus = getValue(userData, "accountStatus", "AccountStatus") || "Unknown";
  const emailVerified = getValue(userData, "emailVerified", "EmailVerified") || false;
  const createdAt = getValue(userData, "createdAt", "CreatedAt") || getValue(userData, "provisionedAt", "ProvisionedAt");
  const firstAccessCompleted = getValue(userData, "firstLoginCompletedAt", "FirstLoginCompletedAt");
  const lastLogin = getValue(userData, "lastLoginAt", "LastLoginAt") || getValue(sessionData, "loginAtUtc", "LoginAtUtc");

  // Session data
  const sessionId = getValue(sessionData, "userSessionId", "UserSessionId") || "N/A";
  const sessionStatus = getValue(sessionData, "status", "Status") || "N/A";
  const authLevel = getValue(sessionData, "authenticationLevel", "AuthenticationLevel") || "N/A";
  const loginTime = getValue(sessionData, "loginAtUtc", "LoginAtUtc");
  const lastActivity = getValue(sessionData, "lastActivityAtUtc", "LastActivityAtUtc");
  const expiresAt = getValue(sessionData, "expiresAtUtc", "ExpiresAtUtc");
  const isCurrentSession = getValue(sessionData, "isCurrentSession", "IsCurrentSession") || false;

  // Device data
  const deviceId = getValue(deviceData, "deviceId", "DeviceId") || "N/A";
  const deviceName = getValue(deviceData, "deviceName", "DeviceName") || "N/A";
  const deviceType = getValue(deviceData, "deviceType", "DeviceType") || "N/A";
  const browserName = getValue(deviceData, "browserName", "BrowserName") || getValue(sessionData, "browserName", "BrowserName") || "N/A";
  const operatingSystem = getValue(deviceData, "operatingSystem", "OperatingSystem") || getValue(sessionData, "operatingSystem", "OperatingSystem") || "N/A";
  const bindingStatus = getValue(deviceData, "bindingStatus", "BindingStatus") || "Unknown";
  const isAttendanceEligible = getValue(deviceData, "isAttendanceEligible", "IsAttendanceEligible") || false;
  const approvedAt = getValue(deviceData, "approvedAt", "ApprovedAt");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Profile</h1>
          <p className="text-slate-400 text-sm">View your account information and current session details</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} className="btn btn-secondary" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={handleLogout} className="btn btn-danger">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </button>
        </div>
      </div>

      {/* Profile Summary Card */}
      <div className="card p-6">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0">
            <User className="h-10 w-10 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{fullName}</h2>
            <p className="text-slate-400 text-sm">@{username}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className={`badge ${accountStatus === "Active" ? "badge-success" : "badge-warning"} text-xs`}>
                {accountStatus}
              </span>
              {emailVerified && (
                <span className="badge badge-info text-xs flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </span>
              )}
              {Array.isArray(roles) && roles.length > 0 && (
                <span className="badge badge-primary text-xs">
                  {roles[0]}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information Card */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-primary-400" />
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Fingerprint className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">User ID</p>
                <p className="font-mono text-sm">{userId}</p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Username</p>
                <p className="font-medium">{username}</p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Email</p>
                <p className="font-medium text-sm">{email}</p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Account Status</p>
                <p className={`font-medium ${accountStatus === "Active" ? "text-success-400" : "text-warning-400"}`}>
                  {accountStatus}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Email Verification</p>
                <p className={`font-medium ${emailVerified ? "text-success-400" : "text-warning-400"}`}>
                  {emailVerified ? "Verified" : "Not Verified"}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Role</p>
                <p className="font-medium">{Array.isArray(roles) && roles.length > 0 ? roles.join(", ") : "N/A"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Timeline Card */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary-400" />
          Account Timeline
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Account Created</p>
                <p className="font-medium text-sm">{formatDateOnly(createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">First Access Completed</p>
                <p className="font-medium text-sm">{formatDateOnly(firstAccessCompleted)}</p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Last Login</p>
                <p className="font-medium text-sm">{formatDate(lastLogin)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Session Card */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Monitor className="h-5 w-5 text-primary-400" />
          Current Session
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Fingerprint className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Session ID</p>
                <p className="font-mono text-sm">{sessionId}</p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Session Status</p>
                <p className={`font-medium ${sessionStatus === "Active" ? "text-success-400" : "text-warning-400"}`}>
                  {sessionStatus}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Authentication Level</p>
                <p className="font-medium text-sm">{authLevel}</p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Current Session</p>
                <p className={`font-medium ${isCurrentSession ? "text-success-400" : "text-warning-400"}`}>
                  {isCurrentSession ? "Yes" : "No"}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Login Time</p>
                <p className="font-medium text-sm">{formatDate(loginTime)}</p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Last Activity</p>
                <p className="font-medium text-sm">{formatDate(lastActivity)}</p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Expires At</p>
                <p className="font-medium text-sm">{formatDate(expiresAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Device Binding Card */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary-400" />
          Device Binding
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Fingerprint className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Device ID</p>
                <p className="font-mono text-sm">{deviceId}</p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Device Name</p>
                <p className="font-medium text-sm">{deviceName}</p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Browser</p>
                <p className="font-medium text-sm">{browserName}</p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Monitor className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Operating System</p>
                <p className="font-medium text-sm">{operatingSystem}</p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Binding Status</p>
                <p className={`font-medium ${bindingStatus === "Approved" ? "text-success-400" : "text-warning-400"}`}>
                  {bindingStatus}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Attendance Eligible</p>
                <p className={`font-medium ${isAttendanceEligible ? "text-success-400" : "text-warning-400"}`}>
                  {isAttendanceEligible ? "Yes" : "No"}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Approved At</p>
                <p className="font-medium text-sm">{formatDate(approvedAt)}</p>
              </div>
            </div>
          </div>
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
