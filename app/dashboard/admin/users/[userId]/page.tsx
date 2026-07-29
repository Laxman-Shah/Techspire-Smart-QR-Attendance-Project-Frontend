"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Mail, Phone, Shield, Smartphone, Clock, Activity, Lock, Trash2, AlertTriangle, CheckCircle, XCircle, Monitor, Globe, Calendar, Fingerprint, RefreshCw, LogOut, Archive } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/src/lib/api/admin";
import { AuthGuard } from "@/src/components/auth-guard";
import { FullPageLoading } from "@/src/components/full-page-loading";
import type { UserDetails } from "@/src/lib/api/admin";

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

function normalizeRoles(input: unknown): string[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          return (
            obj.name ??
            obj.Name ??
            obj.roleName ??
            obj.RoleName ??
            obj.normalizedRoleName ??
            obj.NormalizedRoleName ??
            obj.normalizedName ??
            obj.NormalizedName ??
            ""
          );
        }
        return "";
      })
      .filter(Boolean)
      .map((role) => String(role).toUpperCase());
  }

  if (typeof input === "string") {
    return [input.toUpperCase()];
  }

  return [];
}

function getPrimaryRole(user: unknown): string {
  if (!user || typeof user !== "object") return "UNKNOWN";

  const obj = user as Record<string, unknown>;

  const rawRoles =
    obj.roles ??
    obj.Roles ??
    obj.role ??
    obj.Role ??
    obj.userRoles ??
    obj.UserRoles ??
    [];

  const roles = normalizeRoles(rawRoles);

  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("TEACHER")) return "TEACHER";
  if (roles.includes("STUDENT")) return "STUDENT";

  return roles[0] ?? "UNKNOWN";
}

function UserDetailsContent() {
  const router = useRouter();
  const params = useParams();
  const routeUserId = params.userId as string;
  const userIdNum = parseInt(routeUserId, 10);
  
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Admin action states
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showRevokeSessions, setShowRevokeSessions] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUserDetails();
  }, [routeUserId]);

  const loadUserDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getUserDetails(userIdNum);
      if (res.ok && res.data) {
        setUserDetails(res.data);
      } else {
        setError("Failed to load user details");
      }
    } catch (err) {
      setError("Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  const handleDisableUser = async () => {
    setActionLoading(true);
    try {
      const res = await adminApi.disableUser(userIdNum, { reason: "Disabled by admin" });
      if (res.ok) {
        toast.success("User disabled successfully");
        loadUserDetails();
        setShowDisableConfirm(false);
      } else {
        toast.error("Failed to disable user");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveUser = async () => {
    setActionLoading(true);
    try {
      const res = await adminApi.archiveUser(userIdNum, { reason: "Archived by admin" });
      if (res.ok) {
        toast.success("User archived successfully");
        loadUserDetails();
        setShowArchiveConfirm(false);
      } else {
        toast.error("Failed to archive user");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setActionLoading(true);
    try {
      const res = await adminApi.sendPasswordReset(userIdNum);
      
      if (res.ok) {
        toast.success("Password reset email sent successfully");
        setShowResetPassword(false);
      } else {
        toast.error("Failed to send password reset email");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeDevice = async () => {
    if (!confirm("Are you sure you want to revoke this user's device binding?")) {
      return;
    }
    
    setActionLoading(true);
    try {
      const res = await adminApi.resetUserDevice({ userId: userIdNum, reason: "Device revoked by admin" });
      if (!res.ok) {
        toast.error("Failed to revoke device");
        return;
      }

      const data = res.data;
      if (!data) {
        toast.error("No response data from server");
        return;
      }

      // Show real counts from backend
      const counts = [
        data.devicesRevokedCount > 0 && `${data.devicesRevokedCount} device(s)`,
        data.sessionsRevoked > 0 && `${data.sessionsRevoked} session(s)`,
        data.refreshTokensRevokedCount > 0 && `${data.refreshTokensRevokedCount} refresh token(s)`,
        data.pendingChallengesRevoked > 0 && `${data.pendingChallengesRevoked} challenge(s)`,
        data.otpTokensRevoked > 0 && `${data.otpTokensRevoked} OTP(s)`,
        data.deviceReplacementRequestsRevoked > 0 && `${data.deviceReplacementRequestsRevoked} replacement request(s)`
      ].filter(Boolean);

      if (counts.length === 0) {
        toast.success("Device reset completed, but no active device/session/token was found for this user");
      } else {
        toast.success(`Device reset successful: ${counts.join(", ")} revoked`);
      }

      loadUserDetails();
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeSessions = async () => {
    setActionLoading(true);
    try {
      const res = await adminApi.revokeUserSessions(userIdNum, { reason: "Sessions revoked by admin" });
      if (res.ok) {
        toast.success("Sessions revoked successfully");
        setShowRevokeSessions(false);
        loadUserDetails();
      } else {
        toast.error("Failed to revoke sessions");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <FullPageLoading message="Loading user details..." />;
  }

  if (!userDetails) {
    return (
      <div className="card p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-warning-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">User Not Found</h2>
        <p className="text-slate-400 mb-4">The requested user could not be found.</p>
        <Link href="/dashboard/admin/users" className="btn">
          Back to Users
        </Link>
      </div>
    );
  }

  // Extract data with safe fallbacks
  const userData = userDetails.user || userDetails.User || userDetails;
  const roles = normalizeRoles(getValue(userData, "roles", "Roles"));
  const primaryRole = getPrimaryRole(userData);
  
  // Basic fields
  const displayUserId = getValue(userData, "userId", "UserId") || "N/A";
  const fullName = getValue(userData, "fullName", "FullName") || "N/A";
  const email = getValue(userData, "email", "Email") || "N/A";
  const username = getValue(userData, "username", "Username") || "N/A";
  const phoneNumber = getValue(userData, "phoneNumber", "PhoneNumber") || "N/A";
  const accountStatus = getValue(userData, "accountStatus", "AccountStatus") || "Unknown";
  const emailVerified = getValue(userData, "emailVerified", "EmailVerified") || false;
  
  // Timeline fields
  const createdAt = getValue(userData, "createdAt", "CreatedAt", "provisionedAt", "ProvisionedAt");
  const updatedAt = getValue(userData, "updatedAt", "UpdatedAt");
  const firstLoginCompletedAt = getValue(userData, "firstLoginCompletedAt", "FirstLoginCompletedAt");
  const lastLoginAt = getValue(userData, "lastLoginAt", "LastLoginAt");
  const lockedUntil = getValue(userData, "lockedUntil", "LockedUntil");
  const disabledAt = getValue(userData, "disabledAt", "DisabledAt");
  const archivedAt = getValue(userData, "archivedAt", "ArchivedAt");
  
  // Credential fields
  const credentialType = getValue(userData, "credentialType", "CredentialType");
  const mustChangePassword = getValue(userData, "mustChangePassword", "MustChangePassword");
  const passwordCreatedAt = getValue(userData, "passwordCreatedAt", "PasswordCreatedAt");
  const passwordUpdatedAt = getValue(userData, "passwordUpdatedAt", "PasswordUpdatedAt");
  const lastPasswordResetAt = getValue(userData, "lastPasswordResetAt", "LastPasswordResetAt");
  const temporaryPasswordExpiresAt = getValue(userData, "temporaryPasswordExpiresAt", "TemporaryPasswordExpiresAt");
  const temporaryPasswordUsedAt = getValue(userData, "temporaryPasswordUsedAt", "TemporaryPasswordUsedAt");
  const failedLoginCount = getValue(userData, "failedLoginCount", "FailedLoginCount");
  const securityVersion = getValue(userData, "securityVersion", "SecurityVersion");
  
  // Device fields - extracted directly from userDetails as per backend DTO structure
  const deviceStatus = getValue(userDetails, "deviceStatus", "DeviceStatus", "bindingStatus", "BindingStatus");
  const userDeviceId = getValue(userDetails, "userDeviceId", "UserDeviceId");
  const deviceName = getValue(userDetails, "approvedDevice", "ApprovedDevice", "deviceName", "DeviceName");
  const deviceType = getValue(userDetails, "deviceType", "DeviceType");
  const browserName = getValue(userDetails, "browserName", "BrowserName");
  const browserVersion = getValue(userDetails, "browserVersion", "BrowserVersion");
  const operatingSystem = getValue(userDetails, "operatingSystem", "OperatingSystem");
  const osVersion = getValue(userDetails, "osVersion", "OsVersion");
  const approvedAt = getValue(userDetails, "approvedAt", "ApprovedAt");
  const lastSeenAt = getValue(userDetails, "lastSeenAt", "LastSeenAt");
  const firstSeenAt = getValue(userDetails, "firstSeenAt", "FirstSeenAt");
  const lastIpAddress = getValue(userDetails, "lastIpAddress", "LastIpAddress");
  const attendanceEligible = getValue(userDetails, "attendanceEligible", "AttendanceEligible");
  const singleDeviceRestricted = getValue(userDetails, "singleDeviceRestricted", "SingleDeviceRestricted");
  const revokedAt = getValue(userDetails, "revokedAt", "RevokedAt");
  const revocationReason = getValue(userDetails, "revocationReason", "RevocationReason");
  
  // Sessions - extracted from SessionSummaries array
  const sessions = userDetails.sessionSummaries || userDetails.SessionSummaries || [];
  
  // Login Activities - extracted from LoginActivitySummaries array
  const loginActivities = userDetails.loginActivitySummaries || userDetails.LoginActivitySummaries || [];

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Active: "badge-success",
      PendingFirstAccess: "badge-warning",
      Disabled: "badge-danger",
      Archived: "badge-secondary"
    };
    return <span className={`badge ${colors[status] || "badge-secondary"}`}>{status}</span>;
  };

  const getDeviceBadge = (deviceStatus?: string) => {
    if (!deviceStatus) return <span className="badge badge-secondary">Unknown</span>;
    const colors: Record<string, string> = {
      Approved: "badge-success",
      NotBound: "badge-warning",
      Revoked: "badge-danger"
    };
    return <span className={`badge ${colors[deviceStatus] || "badge-secondary"}`}>{deviceStatus}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/users" className="btn-ghost p-2">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">User Details</h1>
            <p className="text-slate-400 text-sm">View and manage user information</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowResetPassword(true)}
            className="btn btn-secondary text-sm"
            disabled={actionLoading}
          >
            <Lock className="h-4 w-4" />
            Reset Password
          </button>
          <button
            onClick={handleRevokeDevice}
            className="btn btn-secondary text-sm"
            disabled={actionLoading}
          >
            <Smartphone className="h-4 w-4" />
            Reset Device
          </button>
          <button
            onClick={() => setShowRevokeSessions(true)}
            className="btn btn-secondary text-sm"
            disabled={actionLoading}
          >
            <LogOut className="h-4 w-4" />
            Revoke Sessions
          </button>
          <button
            onClick={() => setShowDisableConfirm(true)}
            className="btn btn-warning text-sm"
            disabled={actionLoading || accountStatus === "Disabled"}
          >
            <Shield className="h-4 w-4" />
            Disable
          </button>
          <button
            onClick={() => setShowArchiveConfirm(true)}
            className="btn btn-danger text-sm"
            disabled={actionLoading || accountStatus === "Archived"}
          >
            <Trash2 className="h-4 w-4" />
            Archive
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 bg-warning-500/10 border-warning-500/50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning-400" />
            <p className="text-sm text-warning-200">{error}</p>
          </div>
        </div>
      )}

      {/* Identity Summary Cards */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-primary-400" />
          Identity Summary
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Fingerprint className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">User ID</p>
                <p className="font-mono text-sm">{displayUserId}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Full Name</p>
                <p className="font-medium">{fullName}</p>
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
                <User className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Username</p>
                <p className="font-medium">@{username}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Phone</p>
                <p className="font-medium text-sm">{phoneNumber}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Role</p>
                <span className={`badge ${primaryRole === "ADMIN" ? "badge-success" : primaryRole === "TEACHER" ? "badge-info" : "badge-primary"}`}>{primaryRole}</span>
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
                <p className={`font-medium ${accountStatus === "Active" ? "text-success-400" : "text-warning-400"}`}>{accountStatus}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Email Verified</p>
                <p className={`font-medium ${emailVerified ? "text-success-400" : "text-warning-400"}`}>{emailVerified ? "Yes" : "No"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Timeline */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary-400" />
          Account Timeline
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                <p className="font-medium text-sm">{formatDateOnly(firstLoginCompletedAt)}</p>
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
                <p className="font-medium text-sm">{formatDate(lastLoginAt)}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Last Updated</p>
                <p className="font-medium text-sm">{formatDate(updatedAt)}</p>
              </div>
            </div>
          </div>
          {lockedUntil && (
            <div className="card p-4 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning-500/10 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-warning-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Locked Until</p>
                  <p className="font-medium text-sm">{formatDate(lockedUntil)}</p>
                </div>
              </div>
            </div>
          )}
          {disabledAt && (
            <div className="card p-4 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-danger-500/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-danger-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Disabled At</p>
                  <p className="font-medium text-sm">{formatDate(disabledAt)}</p>
                </div>
              </div>
            </div>
          )}
          {archivedAt && (
            <div className="card p-4 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary-500/10 flex items-center justify-center">
                  <Archive className="h-5 w-5 text-secondary-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Archived At</p>
                  <p className="font-medium text-sm">{formatDate(archivedAt)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security / Credential Details */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary-400" />
          Security / Credential Details
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Credential Type</p>
                <p className="font-medium text-sm">{credentialType || "N/A"}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Must Change Password</p>
                <p className={`font-medium ${mustChangePassword ? "text-warning-400" : "text-success-400"}`}>{mustChangePassword ? "Yes" : "No"}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Password Created</p>
                <p className="font-medium text-sm">{formatDateOnly(passwordCreatedAt)}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Password Updated</p>
                <p className="font-medium text-sm">{formatDateOnly(passwordUpdatedAt)}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Last Password Reset</p>
                <p className="font-medium text-sm">{formatDateOnly(lastPasswordResetAt)}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Temp Password Expires</p>
                <p className="font-medium text-sm">{formatDate(temporaryPasswordExpiresAt)}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Temp Password Used</p>
                <p className="font-medium text-sm">{formatDate(temporaryPasswordUsedAt)}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Failed Login Count</p>
                <p className="font-medium text-sm">{failedLoginCount ?? "N/A"}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Security Version</p>
                <p className="font-medium text-sm">{securityVersion ?? "N/A"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Device Binding Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary-400" />
          Device Binding
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Binding Status</p>
                <p className={`font-medium ${deviceStatus === "Approved" ? "text-success-400" : "text-warning-400"}`}>{deviceStatus || "Unknown"}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Fingerprint className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Device ID</p>
                <p className="font-mono text-sm">{userDeviceId || "N/A"}</p>
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
                <p className="font-medium text-sm">{deviceName || "N/A"}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Monitor className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Device Type</p>
                <p className="font-medium text-sm">{deviceType || "N/A"}</p>
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
                <p className="font-medium text-sm">{browserName || "N/A"}</p>
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
                <p className="font-medium text-sm">{operatingSystem || "N/A"}</p>
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
                <p className={`font-medium ${attendanceEligible ? "text-success-400" : "text-warning-400"}`}>{attendanceEligible ? "Yes" : "No"}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Single Device Restricted</p>
                <p className={`font-medium ${singleDeviceRestricted ? "text-warning-400" : "text-success-400"}`}>{singleDeviceRestricted ? "Yes" : "No"}</p>
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
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Last Seen At</p>
                <p className="font-medium text-sm">{formatDate(lastSeenAt)}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">First Seen At</p>
                <p className="font-medium text-sm">{formatDate(firstSeenAt)}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Last IP Address</p>
                <p className="font-mono text-sm">{lastIpAddress || "N/A"}</p>
              </div>
            </div>
          </div>
          {revokedAt && (
            <div className="card p-4 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-danger-500/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-danger-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Revoked At</p>
                  <p className="font-medium text-sm">{formatDate(revokedAt)}</p>
                </div>
              </div>
            </div>
          )}
          {revocationReason && (
            <div className="card p-4 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-danger-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-danger-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Revocation Reason</p>
                  <p className="font-medium text-sm">{revocationReason}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Disable Confirmation Modal */}
      {showDisableConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning-400" />
              Disable User Account
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Are you sure you want to disable this user account? The user will not be able to log in or access the system.
This action can be reversed by enabling the account.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDisableUser}
                className="btn btn-warning flex-1"
                disabled={actionLoading}
              >
                {actionLoading ? "Disabling..." : "Disable Account"}
              </button>
              <button
                onClick={() => setShowDisableConfirm(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-danger-400" />
              Archive User Account
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Are you sure you want to archive this user account? This is a permanent action and the user's data will be retained but the account will be inactive.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleArchiveUser}
                className="btn btn-danger flex-1"
                disabled={actionLoading}
              >
                {actionLoading ? "Archive..." : "Archive Account"}
              </button>
              <button
                onClick={() => setShowArchiveConfirm(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Sessions Modal */}
      {showRevokeSessions && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <LogOut className="h-5 w-5 text-warning-400" />
              Revoke User Sessions
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Are you sure you want to revoke all sessions for this user? This will sign them out from all devices immediately.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRevokeSessions}
                className="btn btn-warning flex-1"
                disabled={actionLoading}
              >
                {actionLoading ? "Revoking..." : "Revoke All Sessions"}
              </button>
              <button
                onClick={() => setShowRevokeSessions(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current / Recent Sessions Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Monitor className="h-5 w-5 text-primary-400" />
          Current / Recent Sessions
        </h2>
        {Array.isArray(sessions) && sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session: any, index: number) => {
              const sessionId = getValue(session, "userSessionId", "UserSessionId") || `session-${index}`;
              const status = getValue(session, "status", "Status") || "Unknown";
              const authLevel = getValue(session, "authenticationLevel", "AuthenticationLevel") || "N/A";
              const loginAt = getValue(session, "loginAt", "LoginAt");
              const lastActivity = getValue(session, "lastActivityAt", "LastActivityAt");
              const expiresAt = getValue(session, "expiresAt", "ExpiresAt");
              const loginIp = getValue(session, "loginIpAddress", "LoginIpAddress");
              const lastIp = getValue(session, "lastIpAddress", "LastIpAddress");
              const isCurrent = getValue(session, "isCurrentSession", "IsCurrentSession") || false;
              const deviceName = getValue(session, "deviceName", "DeviceName");
              const browserName = getValue(session, "browserName", "BrowserName");
              const operatingSystem = getValue(session, "operatingSystem", "OperatingSystem");
              
              return (
                <div key={sessionId} className="card p-4 bg-slate-800/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-200">{deviceName || `Session ${sessionId}`}</h3>
                        {isCurrent && (
                          <span className="badge badge-success text-xs">Current Session</span>
                        )}
                        <span className={`badge ${status === "Active" ? "badge-success" : "badge-warning"} text-xs`}>{status}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Session ID</p>
                          <p className="text-slate-200 font-mono text-xs">{String(sessionId).substring(0, 8)}...</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Auth Level</p>
                          <p className="text-slate-200">{authLevel}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Browser</p>
                          <p className="text-slate-200">{browserName || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">OS</p>
                          <p className="text-slate-200">{operatingSystem || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Login At</p>
                          <p className="text-slate-200">{formatDate(loginAt)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Last Activity</p>
                          <p className="text-slate-200">{formatDate(lastActivity)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Expires At</p>
                          <p className="text-slate-200">{formatDate(expiresAt)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Login IP</p>
                          <p className="text-slate-200 font-mono text-xs">{loginIp || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Last IP</p>
                          <p className="text-slate-200 font-mono text-xs">{lastIp || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">No sessions found</div>
        )}
      </div>

      {/* Recent Login Activities Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary-400" />
          Recent Login Activities
        </h2>
        {Array.isArray(loginActivities) && loginActivities.length > 0 ? (
          <div className="space-y-3">
            {loginActivities.slice(0, 10).map((activity: any, index: number) => {
              const eventType = getValue(activity, "eventType", "EventType") || "Unknown";
              const outcome = getValue(activity, "outcome", "Outcome") || "Unknown";
              const description = getValue(activity, "description", "Description") || "N/A";
              const ipAddress = getValue(activity, "ipAddress", "IpAddress");
              const browser = getValue(activity, "browserName", "BrowserName");
              const os = getValue(activity, "operatingSystem", "OperatingSystem");
              const occurredAt = getValue(activity, "occurredAt", "OccurredAt");
              
              return (
                <div key={index} className="card p-4 bg-slate-800/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-200">{eventType}</h3>
                        <span className={`badge ${outcome === "Success" ? "badge-success" : "badge-danger"} text-xs`}>{outcome}</span>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">{description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">IP Address</p>
                          <p className="text-slate-200 font-mono text-xs">{ipAddress || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Browser</p>
                          <p className="text-slate-200">{browser || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">OS</p>
                          <p className="text-slate-200">{os || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Occurred At</p>
                          <p className="text-slate-200">{formatDate(occurredAt)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">No login activities found</div>
        )}
      </div>
    </div>
  );
}

export default function UserDetailsPage() {
  return (
    <AuthGuard allowedRoles={["ADMIN"]}>
      <UserDetailsContent />
    </AuthGuard>
  );
}
