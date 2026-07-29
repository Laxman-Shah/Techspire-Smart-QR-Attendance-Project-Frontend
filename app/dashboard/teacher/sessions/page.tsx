"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MonitorCog, AlertTriangle, LogOut, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/src/lib/api/auth";
import { AuthGuard } from "@/src/components/auth-guard";
import { FullPageLoading } from "@/src/components/full-page-loading";

function TeacherSessionsContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.sessions();
      if (res.ok && res.data) {
        const data = res.data as any;
        setSessions(Array.isArray(data.Items) ? data.Items : Array.isArray(data) ? data : []);
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
            {sessions.map((session: any, index: number) => (
              <div key={session.sessionId || session.SessionId || index} className="card p-4 bg-slate-800/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-slate-200">
                        {session.deviceInfo || session.DeviceInfo || "Unknown Device"}
                      </h3>
                      {session.isCurrent && (
                        <span className="badge badge-success text-xs">Current</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Session ID</p>
                        <p className="text-slate-200 font-mono text-xs">
                          {session.sessionId || session.SessionId || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Created At</p>
                        <p className="text-slate-200">
                          {session.createdAt || session.CreatedAt 
                            ? new Date(session.createdAt || session.CreatedAt).toLocaleString() 
                            : "Unknown"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Last Activity</p>
                        <p className="text-slate-200">
                          {session.lastActivityAt || session.LastActivityAt 
                            ? new Date(session.lastActivityAt || session.LastActivityAt).toLocaleString() 
                            : "Unknown"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Status</p>
                        <p className="text-slate-200">
                          {session.status || session.Status || "Active"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeSession(session.sessionId || session.SessionId)}
                    className="btn btn-danger text-sm"
                    disabled={loading}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeacherSessionsPage() {
  return (
    <AuthGuard allowedRoles={["TEACHER"]}>
      <TeacherSessionsContent />
    </AuthGuard>
  );
}
