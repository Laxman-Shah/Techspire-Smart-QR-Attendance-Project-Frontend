"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, CheckCircle, AlertTriangle, ArrowLeft, ShieldAlert, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/src/lib/api/admin";
import { AuthGuard } from "@/src/components/auth-guard";

function DeviceManagementContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [formData, setFormData] = useState({
    userId: "",
    email: "",
    reason: ""
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: "" }));
    setError(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.userId && !formData.email) {
      errors.userId = "Either User ID or Email is required";
      errors.email = "Either User ID or Email is required";
    }
    if (!formData.reason.trim()) {
      errors.reason = "Reason is required (minimum 10 characters)";
    } else if (formData.reason.trim().length < 10) {
      errors.reason = "Reason must be at least 10 characters";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await adminApi.resetUserDevice({
        userId: formData.userId ? parseInt(formData.userId) : undefined,
        email: formData.email || undefined,
        reason: formData.reason
      });

      if (res.ok && res.data) {
        const data = res.data;
        
        // Verify that something was actually revoked before showing success
        const totalRevoked = 
          (data.devicesRevokedCount || 0) +
          (data.sessionsRevoked || 0) +
          (data.refreshTokensRevokedCount || 0) +
          (data.pendingChallengesRevoked || 0) +
          (data.otpTokensRevoked || 0) +
          (data.deviceReplacementRequestsRevoked || 0);

        if (totalRevoked === 0) {
          // Nothing was actually revoked
          setError("Reset completed, but no active device/session/token/challenge was found for this user.");
          toast("No active records found to revoke", { icon: "⚠️" });
        } else {
          // Something was revoked - show success with details
          setSuccess(data);
          toast.success(`Device reset successfully: ${totalRevoked} record(s) revoked`);
          setShowResetConfirm(false);
        }
      } else {
        // Handle field-level validation errors
        if (res.error && typeof res.error === 'object') {
          const errors: Record<string, string> = {};
          const rawErrors = res.error as Record<string, unknown>;

          if (rawErrors.errors && typeof rawErrors.errors === 'object') {
            const errorObj = rawErrors.errors as Record<string, unknown>;
            for (const [key, value] of Object.entries(errorObj)) {
              if (Array.isArray(value)) {
                errors[key] = value.join(", ");
              } else if (typeof value === 'string') {
                errors[key] = value;
              }
            }
          }

          if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
          } else if (rawErrors.message) {
            setError(rawErrors.message as string);
          } else if (rawErrors.detail) {
            setError(rawErrors.detail as string);
          } else {
            setError("Failed to reset user device");
          }
        } else {
          setError("Failed to reset user device");
        }
        toast.error("Failed to reset device");
      }
    } catch (err) {
      setError("An error occurred");
      toast.error("Failed to reset device");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({ userId: "", email: "", reason: "" });
    setFieldErrors({});
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="btn-ghost p-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Device Management</h1>
          <p className="text-slate-400 text-sm">Reset a user's approved browser/device binding</p>
        </div>
      </div>

      {/* How Device Reset Works */}
      <div className="card p-6 bg-primary-500/5 border-primary-500/20">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-200 mb-3">How Device Reset Works</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-400">
              <li>Admin resets the user's approved device binding</li>
              <li>Backend revokes old device, active sessions, and refresh tokens</li>
              <li>User opens the system from the browser/device they want to use</li>
              <li>User logs in with username/password</li>
              <li>User verifies OTP</li>
              <li>That browser/device becomes the new approved device</li>
              <li>One-device restriction applies again</li>
            </ol>
          </div>
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

      {success ? (
        <div className="card p-6 bg-success-500/10 border-success-500/50">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-success-500/20 text-success-400">
              <CheckCircle className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-success-300 mb-4">
                User Device Reset Successfully
              </h2>
              <div className="space-y-3">
                {Object.entries(success as Record<string, unknown>).map(([key, value]) => {
                  return (
                    <div key={key} className="flex justify-between items-start">
                      <span className="text-sm text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className="text-sm text-slate-200 text-right max-w-xs break-words">
                        {value === null || value === undefined ? "N/A" : String(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 card p-4 bg-warning-500/5 border-warning-500/20">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-warning-400 mt-0.5" />
                  <div className="text-sm text-slate-400">
                    <p className="font-medium text-slate-300 mb-1">Important</p>
                    <p className="text-slate-500">
                      After reset, the user must login again with username/password and OTP. The browser/device used in the next successful login will become the new approved device.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleReset}
                  className="btn"
                >
                  Reset Another Device
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-6">
          <form onSubmit={(e) => { e.preventDefault(); setShowResetConfirm(true); }} className="space-y-6">
            {/* Reset Device Binding Form */}
            <div>
              <h3 className="font-semibold text-lg mb-1">Reset Device Binding</h3>
              <p className="text-sm text-slate-400">Enter user identification and reason to reset device binding</p>
            </div>

            {/* User Identification */}
            <div className="space-y-4">
              <p className="text-sm text-slate-400 font-medium">User Identification</p>

              <div>
                <label className="label">User ID</label>
                <input
                  type="text"
                  value={formData.userId}
                  onChange={(e) => handleInputChange("userId", e.target.value)}
                  placeholder="Enter user ID"
                  className={fieldErrors.userId ? "border-danger-500" : ""}
                />
                {fieldErrors.userId && (
                  <p className="text-xs text-danger-400 mt-1">{fieldErrors.userId}</p>
                )}
              </div>

              <div className="text-center text-sm text-slate-500">OR</div>

              <div>
                <label className="label">User Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="user@example.com"
                  className={fieldErrors.email ? "border-danger-500" : ""}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-danger-400 mt-1">{fieldErrors.email}</p>
                )}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="label">Reason <span className="text-danger-400">*</span></label>
              <textarea
                value={formData.reason}
                onChange={(e) => handleInputChange("reason", e.target.value)}
                placeholder="Explain why this device reset is needed (e.g., User lost their phone, Device was damaged, Security concern)"
                rows={4}
                className={fieldErrors.reason ? "border-danger-500" : ""}
              />
              <p className="text-xs text-slate-500 mt-1">
                Minimum 10 characters
              </p>
              {fieldErrors.reason && (
                <p className="text-xs text-danger-400 mt-1">{fieldErrors.reason}</p>
              )}
            </div>

            {/* Warning Card */}
            <div className="card p-4 bg-warning-500/10 border-warning-500/50">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-warning-400 mt-0.5" />
                <div className="text-sm text-slate-400">
                  <p className="font-medium text-slate-300 mb-1">Warning</p>
                  <p className="text-slate-500">
                    This will revoke the user's current approved device binding, terminate active sessions, and revoke refresh tokens. The user must login again with password and OTP. The browser/device used in the next successful login will become the new approved device.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-danger w-full"
              disabled={loading || !formData.userId && !formData.email || formData.reason.trim().length < 10}
            >
              {loading ? "Resetting Device..." : "Reset Device Binding"}
            </button>
          </form>
        </div>
      )}

      {/* Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-warning-500/20 text-warning-400">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-200 mb-2">Confirm Device Reset</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Resetting this user's approved device will revoke old device access, active sessions, and refresh tokens.
                  The user must login again with password and OTP. The browser/device used in the next successful login will become the new approved device.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowResetConfirm(false);
                      handleResetSubmit(new Event("submit") as any);
                    }}
                    className="btn btn-danger flex-1"
                    disabled={loading}
                  >
                    {loading ? "Resetting..." : "Confirm Reset"}
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="btn btn-secondary"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeviceManagementPage() {
  return (
    <AuthGuard allowedRoles={["ADMIN"]}>
      <DeviceManagementContent />
    </AuthGuard>
  );
}
