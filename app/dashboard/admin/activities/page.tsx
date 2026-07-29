"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, RefreshCw, MapPin, Clock, Monitor, CheckCircle, XCircle, Filter, X } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/src/lib/api/auth";
import { AuthGuard } from "@/src/components/auth-guard";
import { FullPageLoading } from "@/src/components/full-page-loading";
import { useAuthStore } from "@/src/store/auth-store";

function AdminActivitiesContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [outcomeFilter, setOutcomeFilter] = useState<string>("All");
  const loadingRef = useRef(false);

  const { accessToken, isInitializing, hasInitialized, refreshFailed } = useAuthStore();

  useEffect(() => {
    // Wait for auth initialization to complete
    if (isInitializing || !hasInitialized) {
      if (process.env.NODE_ENV === "development") {
        console.log("[ACTIVITIES] Waiting for auth initialization:", { isInitializing, hasInitialized });
      }
      return;
    }

    // Check if refresh has failed or user is not authenticated
    if (refreshFailed || !accessToken) {
      if (process.env.NODE_ENV === "development") {
        console.log("[ACTIVITIES] Not authenticated or refresh failed, redirecting to login:", { 
          refreshFailed, 
          hasToken: Boolean(accessToken) 
        });
      }
      router.replace("/login");
      return;
    }

    // Only load activities if authenticated
    if (process.env.NODE_ENV === "development") {
      console.log("[ACTIVITIES] Authenticated, loading activities");
    }
    loadActivities();
  }, [isInitializing, hasInitialized, refreshFailed, accessToken, router]);

  const extractLoginActivities = (raw: unknown): any[] => {
    if (Array.isArray(raw)) return raw;

    if (!raw || typeof raw !== "object") return [];

    const obj = raw as Record<string, any>;

    const activities =
      obj.items ??
      obj.Items ??
      obj.activities ??
      obj.Activities ??
      obj.data?.activities ??
      obj.data?.Activities ??
      obj.Data?.Activities ??
      obj.data?.items ??
      obj.data?.Items ??
      obj.result?.activities ??
      obj.result?.Activities ??
      obj.Result?.Activities ??
      obj.result?.items ??
      obj.result?.Items ??
      [];

    return Array.isArray(activities) ? activities : [];
  };

  const extractTotalCount = (raw: unknown): number => {
    if (!raw || typeof raw !== "object") return 0;

    const obj = raw as Record<string, any>;

    return Number(
      obj.totalCount ??
      obj.TotalCount ??
      obj.data?.totalCount ??
      obj.Data?.TotalCount ??
      obj.result?.totalCount ??
      obj.Result?.TotalCount ??
      0
    );
  };

  const loadActivities = async () => {
    // Prevent duplicate requests
    if (loadingRef.current) {
      if (process.env.NODE_ENV === "development") {
        console.log("[ACTIVITIES] Request already in progress, skipping");
      }
      return;
    }
    
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      if (process.env.NODE_ENV === "development") {
        console.log("[ACTIVITIES] Calling login activities API");
        console.log("[ACTIVITIES] Current token exists:", Boolean(useAuthStore.getState().accessToken));
      }
      
      const res = await authApi.loginActivities();
      
      if (process.env.NODE_ENV === "development") {
        console.log("[ACTIVITIES] API response:", res.status, res.ok);
      }
      
      if (res.ok && res.data) {
        const extractedActivities = extractLoginActivities(res.data);
        const extractedTotalCount = extractTotalCount(res.data);
        setActivities(extractedActivities);
        setTotalCount(extractedTotalCount);
      } else {
        const errorDetail = (res.data as any)?.detail || (res.data as any)?.title || "Failed to load login activities";
        setError(errorDetail);
        if (process.env.NODE_ENV === "development") {
          console.log("Login activities error:", res.status, res.data);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load login activities";
      setError(errorMessage);
      if (process.env.NODE_ENV === "development") {
        console.log("Login activities exception:", err);
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const getActivityId = (activity: any): string => {
    return String(
      activity.loginActivityId ??
      activity.LoginActivityId ??
      activity.id ??
      activity.Id ??
      crypto.randomUUID()
    );
  };

  const getEventType = (activity: any): string => {
    return String(
      activity.eventType ??
      activity.EventType ??
      "Unknown"
    );
  };

  const getOutcome = (activity: any): string => {
    return String(
      activity.outcome ??
      activity.Outcome ??
      "Unknown"
    );
  };

  const getDescription = (activity: any): string => {
    return String(
      activity.description ??
      activity.Description ??
      "N/A"
    );
  };

  const getIpAddress = (activity: any): string => {
    return String(
      activity.ipAddress ??
      activity.IpAddress ??
      "N/A"
    );
  };

  const getBrowserName = (activity: any): string => {
    return String(
      activity.browserName ??
      activity.BrowserName ??
      "N/A"
    );
  };

  const getOperatingSystem = (activity: any): string => {
    return String(
      activity.operatingSystem ??
      activity.OperatingSystem ??
      "N/A"
    );
  };

  const getDeviceType = (activity: any): string => {
    return String(
      activity.deviceType ??
      activity.DeviceType ??
      "N/A"
    );
  };

  const getOccurredAt = (activity: any): string | null => {
    return (
      activity.occurredAtUtc ??
      activity.OccurredAtUtc ??
      activity.occurredAt ??
      activity.OccurredAt ??
      null
    );
  };

  const getUserId = (activity: any): string | null => {
    const userId = activity.userId ?? activity.UserId ?? activity.user_id ?? activity.User_Id ?? null;
    return userId !== null ? String(userId) : null;
  };

  const getSessionId = (activity: any): string | null => {
    const sessionId = activity.userSessionId ?? activity.UserSessionId ?? activity.session_id ?? activity.Session_Id ?? null;
    return sessionId !== null ? String(sessionId) : null;
  };

  const getChallengeId = (activity: any): string | null => {
    const challengeId = activity.loginChallengeId ?? activity.LoginChallengeId ?? activity.challenge_id ?? activity.Challenge_Id ?? null;
    return challengeId !== null ? String(challengeId) : null;
  };

  const getFailureCode = (activity: any): string | null => {
    const failureCode = activity.failureCode ?? activity.FailureCode ?? activity.failure_code ?? activity.Failure_Code ?? null;
    return failureCode !== null ? String(failureCode) : null;
  };

  const getAttemptedIdentifier = (activity: any): string | null => {
    const identifier = activity.attemptedIdentifier ?? activity.AttemptedIdentifier ?? activity.attempted_identifier ?? activity.Attempted_Identifier ?? null;
    return identifier !== null ? String(identifier) : null;
  };

  const formatDate = (date: string | null): string => {
    if (!date) return "Unknown";
    try {
      return new Date(date).toLocaleString();
    } catch {
      return "Unknown";
    }
  };

  const getStatusBadge = (outcome: string) => {
    const normalized = outcome.toLowerCase();
    if (normalized === "success" || normalized === "succeeded") {
      return <span className="badge badge-success text-xs flex items-center gap-1"><CheckCircle className="h-3 w-3" />Success</span>;
    }
    if (normalized === "failure" || normalized === "failed") {
      return <span className="badge badge-danger text-xs flex items-center gap-1"><XCircle className="h-3 w-3" />Failed</span>;
    }
    return <span className="badge badge-warning text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{outcome}</span>;
  };

  const filteredActivities = activities.filter((activity) => {
    if (outcomeFilter === "All") return true;
    const outcome = getOutcome(activity).toLowerCase();
    if (outcomeFilter === "Success") return outcome === "success" || outcome === "succeeded";
    if (outcomeFilter === "Failure") return outcome === "failure" || outcome === "failed";
    return true;
  });

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
          <p className="text-slate-400 text-sm">View your login activity history ({totalCount} total)</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Outcome Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary-500"
            >
              <option value="All">All Outcomes</option>
              <option value="Success">Success Only</option>
              <option value="Failure">Failure Only</option>
            </select>
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
          {outcomeFilter !== "All" && (
            <span className="badge badge-secondary text-xs ml-2">
              Filtered: {outcomeFilter}
              <button
                onClick={() => setOutcomeFilter("All")}
                className="ml-1 hover:text-white"
              >
                <X className="h-3 w-3 inline" />
              </button>
            </span>
          )}
        </h2>

        {loading ? (
          <div className="text-center py-8 text-slate-400">Loading activities...</div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            {activities.length === 0 ? "No login activities found yet." : "No activities match the current filter."}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredActivities.map((activity: any, index: number) => {
              const activityId = getActivityId(activity);
              const eventType = getEventType(activity);
              const outcome = getOutcome(activity);
              const description = getDescription(activity);
              const ipAddress = getIpAddress(activity);
              const browserName = getBrowserName(activity);
              const operatingSystem = getOperatingSystem(activity);
              const deviceType = getDeviceType(activity);
              const occurredAt = getOccurredAt(activity);
              const userId = getUserId(activity);
              const sessionId = getSessionId(activity);
              const challengeId = getChallengeId(activity);
              const failureCode = getFailureCode(activity);
              const attemptedIdentifier = getAttemptedIdentifier(activity);

              return (
                <div 
                  key={activityId} 
                  className="card p-4 bg-slate-800/50 hover:bg-slate-800/70 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedActivity({
                      activityId,
                      eventType,
                      outcome,
                      description,
                      ipAddress,
                      browserName,
                      operatingSystem,
                      deviceType,
                      occurredAt,
                      userId,
                      sessionId,
                      challengeId,
                      failureCode,
                      attemptedIdentifier,
                      isCurrentSession: activity.isCurrentSession ?? activity.IsCurrentSession ?? false,
                      correlationId: activity.correlationId ?? activity.CorrelationId ?? null,
                      deviceReplacementRequestId: activity.deviceReplacementRequestId ?? activity.DeviceReplacementRequestId ?? null,
                      raw: activity
                    });
                    setShowModal(true);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-200">{eventType}</h3>
                        {getStatusBadge(outcome)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-500" />
                          <div>
                            <p className="text-slate-500">Time</p>
                            <p className="text-slate-200">{formatDate(occurredAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-500" />
                          <div>
                            <p className="text-slate-500">IP Address</p>
                            <p className="text-slate-200 font-mono text-xs">{ipAddress}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-slate-500" />
                          <div>
                            <p className="text-slate-500">Browser</p>
                            <p className="text-slate-200">{browserName}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-slate-500">OS</p>
                          <p className="text-slate-200">{operatingSystem}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
                  <p className="text-sm font-medium">{selectedActivity.eventType}</p>
                </div>
                <div className="card p-3 bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">Outcome</p>
                  <div>{getStatusBadge(selectedActivity.outcome)}</div>
                </div>
              </div>

              {/* Description */}
              {selectedActivity.description && selectedActivity.description !== "N/A" && (
                <div className="card p-3 bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">Description</p>
                  <p className="text-sm text-slate-300">{selectedActivity.description}</p>
                </div>
              )}

              {/* Timestamp */}
              <div className="card p-3 bg-slate-800/50">
                <p className="text-xs text-slate-500 mb-1">Occurred At</p>
                <p className="text-sm">{formatDate(selectedActivity.occurredAt)}</p>
              </div>

              {/* Network Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-3 bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">IP Address</p>
                  <p className="text-sm font-mono">{selectedActivity.ipAddress}</p>
                </div>
                <div className="card p-3 bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">Device Type</p>
                  <p className="text-sm">{selectedActivity.deviceType}</p>
                </div>
              </div>

              {/* Device Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-3 bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">Browser</p>
                  <p className="text-sm">{selectedActivity.browserName}</p>
                </div>
                <div className="card p-3 bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">Operating System</p>
                  <p className="text-sm">{selectedActivity.operatingSystem}</p>
                </div>
              </div>

              {/* User & Session Info */}
              <div className="grid grid-cols-2 gap-4">
                {selectedActivity.userId && (
                  <div className="card p-3 bg-slate-800/50">
                    <p className="text-xs text-slate-500 mb-1">User ID</p>
                    <p className="text-sm font-mono">{selectedActivity.userId}</p>
                  </div>
                )}
                {selectedActivity.sessionId && (
                  <div className="card p-3 bg-slate-800/50">
                    <p className="text-xs text-slate-500 mb-1">Session ID</p>
                    <p className="text-sm font-mono text-xs">{String(selectedActivity.sessionId).substring(0, 8)}...</p>
                  </div>
                )}
              </div>

              {/* Challenge Info */}
              {selectedActivity.challengeId && (
                <div className="card p-3 bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">Challenge ID</p>
                  <p className="text-sm font-mono text-xs">{String(selectedActivity.challengeId).substring(0, 8)}...</p>
                </div>
              )}

              {/* Failure Info */}
              {selectedActivity.failureCode && (
                <div className="card p-3 bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">Failure Code</p>
                  <p className="text-sm font-mono">{selectedActivity.failureCode}</p>
                </div>
              )}

              {/* Attempted Identifier */}
              {selectedActivity.attemptedIdentifier && (
                <div className="card p-3 bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">Attempted Identifier</p>
                  <p className="text-sm font-mono">{selectedActivity.attemptedIdentifier}</p>
                </div>
              )}

              {/* Correlation ID */}
              {selectedActivity.correlationId && (
                <div className="card p-3 bg-slate-800/50">
                  <p className="text-xs text-slate-500 mb-1">Correlation ID</p>
                  <p className="text-sm font-mono text-xs">{String(selectedActivity.correlationId).substring(0, 8)}...</p>
                </div>
              )}

              {/* Current Session Badge */}
              {selectedActivity.isCurrentSession && (
                <div className="card p-3 bg-success-500/10 border-success-500/50">
                  <p className="text-xs text-success-400 flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    This activity belongs to your current session
                  </p>
                </div>
              )}

              {/* Raw JSON (Development Only) */}
              {process.env.NODE_ENV === "development" && (
                <details className="card p-3 bg-slate-900/50">
                  <summary className="text-xs text-slate-500 cursor-pointer">View Raw JSON</summary>
                  <pre className="mt-2 text-xs text-slate-400 overflow-x-auto">
                    {JSON.stringify(selectedActivity.raw, null, 2)}
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

export default function AdminActivitiesPage() {
  return (
    <AuthGuard allowedRoles={["ADMIN"]}>
      <AdminActivitiesContent />
    </AuthGuard>
  );
}
