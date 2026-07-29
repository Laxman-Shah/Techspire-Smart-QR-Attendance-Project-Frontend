"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Smartphone, ArrowLeft, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/src/lib/api/auth";
import { useAuthStore } from "@/src/store/auth-store";
import { ResponseViewer } from "@/src/components/response-viewer";

export default function SessionsPage() {
  const router = useRouter();
  const { accessToken, clearAuth } = useAuthStore();
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<unknown>(null);

  useEffect(() => {
    if (!accessToken) {
      router.push("/login");
    }
  }, [accessToken, router]);

  const handleGetSessions = async () => {
    setLoading(true);
    try {
      const res = await authApi.sessions();
      setLastResponse(res.raw);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async () => {
    if (!sessionId) {
      toast.error("Please enter a session ID");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.revokeSession(sessionId);
      setLastResponse(res.raw);
      if (res.ok) toast.success("Session revoked");
      else toast.error("Failed to revoke session");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeOtherSessions = async () => {
    setLoading(true);
    try {
      const res = await authApi.revokeOtherSessions();
      setLastResponse(res.raw);
      if (res.ok) toast.success("Other sessions revoked");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    setLoading(true);
    try {
      const res = await authApi.revokeAllSessions();
      setLastResponse(res.raw);
      if (res.ok) {
        toast.success("All sessions revoked");
        clearAuth();
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!accessToken) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Session Management</h1>
            <p className="text-slate-400 text-sm">View and manage your active sessions</p>
          </div>
        </div>
        <div className="badge badge-warning">Developer Tools</div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary-400" />
          Session Operations
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <button onClick={handleGetSessions} className="card p-4 text-left hover:border-primary-500/50 transition-colors" disabled={loading}>
            <h3 className="font-medium">Get Sessions</h3>
            <p className="text-sm text-slate-400">View all active sessions</p>
          </button>
          <button onClick={handleRevokeOtherSessions} className="card p-4 text-left hover:border-primary-500/50 transition-colors" disabled={loading}>
            <h3 className="font-medium">Revoke Other Sessions</h3>
            <p className="text-sm text-slate-400">Revoke all sessions except current</p>
          </button>
          <button onClick={handleRevokeAllSessions} className="card p-4 text-left hover:border-danger-500/50 transition-colors" disabled={loading}>
            <h3 className="font-medium text-danger-400">Revoke All Sessions</h3>
            <p className="text-sm text-slate-400">Warning: This will log you out</p>
          </button>
          <form onSubmit={(e) => { e.preventDefault(); handleRevokeSession(); }} className="space-y-4">
            <div>
              <label className="label">Session ID</label>
              <input value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="guid" required />
            </div>
            <button type="submit" className="btn w-full" disabled={loading}>{loading ? "Revoking..." : "Revoke Session"}</button>
          </form>
        </div>
      </div>

      {lastResponse != null && (
        <ResponseViewer data={lastResponse as Record<string, unknown>} title="API Response" />
      )}
    </div>
  );
}
