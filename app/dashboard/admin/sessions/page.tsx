"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MonitorCog, AlertTriangle, LogOut, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/src/lib/api/auth";
import { AuthGuard } from "@/src/components/auth-guard";
import { FullPageLoading } from "@/src/components/full-page-loading";

function AdminSessionsContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const extractSessions = (raw: unknown): any[] => {
    if (Array.isArray(raw)) return raw;

    if (!raw || typeof raw !== "object") return [];

    const obj = raw as Record<string, any>;

    const sessions =
      obj.sessions ??
      obj.Sessions ??
      obj.items ??
      obj.Items ??
      obj.data?.sessions ??
      obj.data?.Sessions ??
      obj.Data?.Sessions ??
      obj.result?.sessions ??
      obj.result?.Sessions ??
      obj.Result?.Sessions ??
      [];

    return Array.isArray(sessions) ? sessions : [];
  };

  const getSessionId = (session: any): string | null => {
    const value =
      session?.userSessionId ??
      session?.UserSessionId ??
      session?.sessionId ??
      session?.SessionId ??
      session?.id ??
      session?.Id ??
      null;

    return value ? String(value) : null;
  };

  const getSessionStatus = (session: any): string => {
    return String(
      session?.status ??
      session?.Status ??
      "Unknown"
    );
  };

  const isActiveSession = (session: any): boolean => {
    return getSessionStatus(session).toLowerCase() === "active";
  };

  const isCurrentSession = (session: any): boolean => {
    return Boolean(
      session?.isCurrentSession ??
      session?.IsCurrentSession ??
      false
    );
  };

  const getDeviceName = (session: any): string => {
    return (
      session?.deviceName ??
      session?.DeviceName ??
      session?.device?.deviceName ??
      session?.Device?.DeviceName ??
      "Unknown Device"
    );
  };

  const getBrowserName = (session: any): string => {
    return (
      session?.browserName ??
      session?.BrowserName ??
      session?.device?.browserName ??
      session?.Device?.BrowserName ??
      "N/A"
    );
  };

  const getOperatingSystem = (session: any): string => {
    return (
      session?.operatingSystem ??
      session?.OperatingSystem ??
      session?.device?.operatingSystem ??
      session?.Device?.OperatingSystem ??
      "N/A"
    );
  };

  const getLoginAt = (session: any): string | null => {
    return (
      session?.loginAtUtc ??
      session?.LoginAtUtc ??
      session?.loginAt ??
      session?.LoginAt ??
      null
    );
  };

  const getLastActivityAt = (session: any): string | null => {
    return (
      session?.lastActivityAtUtc ??
      session?.LastActivityAtUtc ??
      session?.lastActivityAt ??
      session?.LastActivityAt ??
      null
    );
  };

  const getExpiresAt = (session: any): string | null => {
    return (
      session?.expiresAtUtc ??
      session?.ExpiresAtUtc ??
      session?.expiresAt ??
      session?.ExpiresAt ??
      null
    );
  };

  const getLoginIp = (session: any): string => {
    return (
      session?.loginIpAddress ??
      session?.LoginIpAddress ??
      session?.ipAddress ??
      session?.IpAddress ??
      "N/A"
    );
  };

  const getLastIp = (session: any): string => {
    return (
      session?.lastIpAddress ??
      session?.LastIpAddress ??
      "N/A"
    );
  };

  const formatDate = (date: string | null): string => {
    if (!date) return "Unknown";
    try {
      return new Date(date).toLocaleString();
    } catch {
      return "Unknown";
    }
  };

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.sessions();
      if (res.ok && res.data) {
        const allSessions = extractSessions(res.data);
        const activeSessions = allSessions.filter(isActiveSession);
        setSessions(activeSessions);
      } else {
        setError("Failed to load sessions");
      }
    } catch (err) {
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!sessionId || sessionId === "N/A") {
      toast.error("Cannot revoke this session because session ID is missing.");
      return;
    }

    if (!confirm("Are you sure you want to revoke this session?")) {
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.revokeSession(sessionId);
      if (res.ok) {
        toast.success("Session revoked successfully");
        loadSessions();
      } else {
        toast.error("Failed to revoke session");
      }
    } catch (err) {
      toast.error("Failed to revoke session");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeOtherSessions = async () => {
    if (!confirm("Are you sure you want to revoke all other sessions? This will log you out from other devices.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.revokeOtherSessions();
      if (res.ok) {
        toast.success("Other sessions revoked successfully");
        loadSessions();
      } else {
        toast.error("Failed to revoke other sessions");
      }
    } catch (err) {
      toast.error("Failed to revoke other sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm("Are you sure you want to revoke ALL sessions? This will log you out from this device too.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.revokeAllSessions();
      if (res.ok) {
        toast.success("All sessions revoked successfully");
        router.push("/login");
      } else {
        toast.error("Failed to revoke all sessions");
      }
    } catch (err) {
      toast.error("Failed to revoke all sessions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Active Sessions</h1>
          <p className="text-slate-400 text-sm">View and manage your active login sessions</p>
        </div>
        <button
          onClick={loadSessions}
          className="btn btn-secondary"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="card p-4 bg-danger-500/10 border-danger-500/50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-danger-400" />
            <p className="text-sm text-danger-200">{error}</p>
          </div>
        </div>
      )}

      {/* Session Actions */}
      <div className="card p-6">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleRevokeOtherSessions}
            className="btn btn-secondary"
            disabled={loading}
          >
            Revoke Other Sessions
          </button>
          <button
            onClick={handleRevokeAllSessions}
            className="btn btn-danger"
            disabled={loading}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Revoke All Sessions
          </button>
        </div>
      </div>

      {/* Sessions List */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MonitorCog className="h-5 w-5 text-primary-400" />
          Your Sessions
        </h2>

        {loading ? (
          <div className="text-center py-8 text-slate-400">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-slate-400">No active sessions found</div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session: any, index: number) => {
              const sessionId = getSessionId(session);
              const status = getSessionStatus(session);
              const current = isCurrentSession(session);
              const deviceName = getDeviceName(session);
              const browserName = getBrowserName(session);
              const operatingSystem = getOperatingSystem(session);
              const loginAt = getLoginAt(session);
              const lastActivityAt = getLastActivityAt(session);
              const expiresAt = getExpiresAt(session);
              const loginIp = getLoginIp(session);
              const lastIp = getLastIp(session);

              return (
                <div key={sessionId || index} className="card p-4 bg-slate-800/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-200">{deviceName}</h3>
                        {current && (
                          <span className="badge badge-success text-xs">Current Session</span>
                        )}
                        <span className={`badge ${status === "Active" ? "badge-success" : "badge-warning"} text-xs`}>{status}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Session ID</p>
                          <p className="text-slate-200 font-mono text-xs">{sessionId || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Browser</p>
                          <p className="text-slate-200">{browserName}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">OS</p>
                          <p className="text-slate-200">{operatingSystem}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Login IP</p>
                          <p className="text-slate-200">{loginIp}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Login At</p>
                          <p className="text-slate-200">{formatDate(loginAt)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Last Activity</p>
                          <p className="text-slate-200">{formatDate(lastActivityAt)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Expires At</p>
                          <p className="text-slate-200">{formatDate(expiresAt)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Last IP</p>
                          <p className="text-slate-200">{lastIp}</p>
                        </div>
                      </div>
                    </div>
                    {!current && sessionId && (
                      <button
                        onClick={() => handleRevokeSession(sessionId)}
                        className="btn btn-danger text-sm"
                        disabled={loading}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminSessionsPage() {
  return (
    <AuthGuard allowedRoles={["ADMIN"]}>
      <AdminSessionsContent />
    </AuthGuard>
  );
}
