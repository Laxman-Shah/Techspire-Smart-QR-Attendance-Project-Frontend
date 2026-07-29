"use client";
import { useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/src/lib/api/auth";
import { ResponseViewer } from "@/src/components/response-viewer";

export default function ActivitiesPage() {
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<unknown>(null);

  const handleLoginActivities = async () => {
    setLoading(true);
    try {
      const res = await authApi.loginActivities();
      setLastResponse(res.raw);
    } finally {
      setLoading(false);
    }
  };

  const handlePageLoad = async () => {
    setLoading(true);
    try {
      const res = await authApi.pageLoad();
      setLastResponse(res.raw);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Activities</h1>
            <p className="text-slate-400 text-sm">View login activity and page context</p>
          </div>
        </div>
        <div className="badge badge-warning">Developer Tools</div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary-400" />
          Activity Operations
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <button onClick={handleLoginActivities} className="card p-4 text-left hover:border-primary-500/50 transition-colors" disabled={loading}>
            <h3 className="font-medium">Login Activities</h3>
            <p className="text-sm text-slate-400">View login activity history</p>
          </button>
          <button onClick={handlePageLoad} className="card p-4 text-left hover:border-primary-500/50 transition-colors" disabled={loading}>
            <h3 className="font-medium">Page Load Context</h3>
            <p className="text-sm text-slate-400">Get current page load information</p>
          </button>
        </div>
      </div>

      {lastResponse != null && (
        <ResponseViewer data={lastResponse as Record<string, unknown>} title="API Response" />
      )}
    </div>
  );
}
