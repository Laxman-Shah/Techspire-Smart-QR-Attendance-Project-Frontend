"use client";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, RefreshCw, MapPin, Clock, Monitor, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/src/lib/api/auth";
import { AuthGuard } from "@/src/components/auth-guard";
import { FullPageLoading } from "@/src/components/full-page-loading";

function TeacherActivitiesContent() {
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.loginActivities();
      if (res.ok && res.data) {
        const data = res.data as any;
        setActivities(Array.isArray(data.Items) ? data.Items : Array.isArray(data) ? data : []);
      } else {
        setError("Failed to load login activities");
      }
    } catch (err) {
      setError("Failed to load login activities");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (outcome: string) => {
    if (outcome === "Success" || outcome === "SUCCESS") {
      return <span className="badge badge-success text-xs flex items-center gap-1"><CheckCircle className="h-3 w-3" />Success</span>;
    }
    return <span className="badge badge-danger text-xs flex items-center gap-1"><XCircle className="h-3 w-3" />Failed</span>;
  };

  const formatObject = (obj: any, depth = 0): string => {
    if (obj === null || obj === undefined) return "N/A";
    if (typeof obj !== "object") return String(obj);
    if (depth > 2) return "[Nested Object]";
    
    return Object.entries(obj)
      .map(([key, value]) => {
        const formattedValue = typeof value === "object" ? formatObject(value, depth + 1) : String(value);
        return `${key}: ${formattedValue}`;
      })
      .join(", ");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Login Activities</h1>
          <p className="text-slate-400 text-sm">View your login activity history</p>
        </div>
        <button
          onClick={loadActivities}
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

      {/* Activities List */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary-400" />
          Recent Login Activities
        </h2>

        {loading ? (
          <div className="text-center py-8 text-slate-400">Loading activities...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-slate-400">No login activities found</div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity: any, index: number) => (
              <div 
                key={activity.activityId || activity.ActivityId || index} 
                className="card p-4 bg-slate-800/50 hover:bg-slate-800/70 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedActivity(activity);
                  setShowModal(true);
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-slate-200">
                        {activity.eventType || activity.EventType || "Login Attempt"}
                      </h3>
                      {getStatusBadge(activity.outcome || activity.Outcome)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-500" />
                        <div>
                          <p className="text-slate-500">Time</p>
                          <p className="text-slate-200">
                            {activity.occurredAt || activity.OccurredAt 
                              ? new Date(activity.occurredAt || activity.OccurredAt).toLocaleString() 
                              : "Unknown"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-500" />
                        <div>
                          <p className="text-slate-500">IP Address</p>
                          <p className="text-slate-200 font-mono text-xs">
                            {activity.ipAddress || activity.IpAddress || "Unknown"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-slate-500" />
                        <div>
                          <p className="text-slate-500">Device</p>
                          <p className="text-slate-200">
                            {activity.browserName || activity.BrowserName || "Unknown"}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-slate-500">Location</p>
                        <p className="text-slate-200">
                          {activity.city || activity.City || "Unknown"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Details Modal */}
      {showModal && selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur p-4">
          <div className="card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Activity Details</h3>
              <button
                onClick={() => setShowModal(false)}
                className="btn-ghost p-2"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-3 bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">Event Type</p>
                  <p className="text-sm font-medium">{selectedActivity.eventType || selectedActivity.EventType || "Unknown"}</p>
                </div>
                <div className="card p-3 bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">Outcome</p>
                  <div>{getStatusBadge(selectedActivity.outcome || selectedActivity.Outcome)}</div>
                </div>
              </div>

              {/* Timestamp */}
              <div className="card p-3 bg-slate-800/50">
                <p className="text-xs text-slate-500 mb-1">Occurred At</p>
                <p className="text-sm">
                  {selectedActivity.occurredAt || selectedActivity.OccurredAt 
                    ? new Date(selectedActivity.occurredAt || selectedActivity.OccurredAt).toLocaleString() 
                    : "Unknown"}
                </p>
              </div>

              {/* Network Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-3 bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">IP Address</p>
                  <p className="text-sm font-mono">{selectedActivity.ipAddress || selectedActivity.IpAddress || "Unknown"}</p>
                </div>
                <div className="card p-3 bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">User Agent</p>
                  <p className="text-sm truncate">{selectedActivity.userAgent || selectedActivity.UserAgent || "Unknown"}</p>
                </div>
              </div>

              {/* Device Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-3 bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">Browser</p>
                  <p className="text-sm">{selectedActivity.browserName || selectedActivity.BrowserName || "Unknown"}</p>
                </div>
                <div className="card p-3 bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">OS</p>
                  <p className="text-sm">{selectedActivity.operatingSystem || selectedActivity.OperatingSystem || "Unknown"}</p>
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-3 bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">City</p>
                  <p className="text-sm">{selectedActivity.city || selectedActivity.City || "Unknown"}</p>
                </div>
                <div className="card p-3 bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">Country</p>
                  <p className="text-sm">{selectedActivity.country || selectedActivity.Country || "Unknown"}</p>
                </div>
              </div>

              {/* Additional Details */}
              <div className="card p-3 bg-slate-800/50">
                <p className="text-xs text-slate-500 mb-1">Additional Details</p>
                <p className="text-sm text-slate-300">
                  {formatObject(selectedActivity.details || selectedActivity.Details)}
                </p>
              </div>

              {/* Raw JSON (Development Only) */}
              {process.env.NODE_ENV === "development" && (
                <details className="card p-3 bg-slate-900/50">
                  <summary className="text-xs text-slate-500 cursor-pointer">View Raw JSON</summary>
                  <pre className="mt-2 text-xs text-slate-400 overflow-x-auto">
                    {JSON.stringify(selectedActivity, null, 2)}
                  </pre>
                </details>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeacherActivitiesPage() {
  return (
    <AuthGuard allowedRoles={["TEACHER"]}>
      <TeacherActivitiesContent />
    </AuthGuard>
  );
}
