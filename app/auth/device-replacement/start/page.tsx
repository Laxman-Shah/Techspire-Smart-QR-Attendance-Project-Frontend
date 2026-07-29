"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, ArrowLeft, AlertTriangle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/src/lib/api/auth";
import type { StartDeviceReplacementCompletionRequest } from "@/src/types/api";
import { FullPageLoading } from "@/src/components/full-page-loading";
import { buildDeviceContext } from "@/src/lib/device/device-context";

function DeviceReplacementStartContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<StartDeviceReplacementCompletionRequest>({
    DeviceReplacementRequestId: "",
    CurrentPasswordOrTemporaryPassword: ""
  });

  const handleInputChange = (field: keyof StartDeviceReplacementCompletionRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.DeviceReplacementRequestId.trim()) {
      setError("Request ID is required");
      return;
    }
    if (!formData.CurrentPasswordOrTemporaryPassword.trim()) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await authApi.startDeviceReplacement(formData);
      
      if (res.ok && res.raw) {
        setSuccess(res.raw);
        toast.success("Device replacement started. Please verify OTP.");
      } else {
        if (res.raw && typeof res.raw === 'object') {
          const rawErrors = res.raw as Record<string, unknown>;
          setError(rawErrors.message as string || "Failed to start device replacement");
        } else {
          setError("Failed to start device replacement");
        }
        toast.error("Failed to start device replacement");
      }
    } catch (err) {
      setError("An error occurred");
      toast.error("Failed to start device replacement");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (success && typeof success === 'object') {
      const loginChallengeId = (success as Record<string, unknown>).LoginChallengeId as string;
      if (loginChallengeId) {
        router.push(`/auth/device-replacement/verify?requestId=${formData.DeviceReplacementRequestId}&challengeId=${loginChallengeId}`);
      } else {
        router.push("/auth/device-replacement/verify");
      }
    } else {
      router.push("/auth/device-replacement/verify");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="p-4 rounded-full bg-primary-500/10 text-primary-400 mx-auto mb-4">
            <Smartphone className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Device Replacement</h1>
          <p className="text-slate-400 text-sm">Complete device replacement from your new device</p>
        </div>

        {error && (
          <div className="card p-4 bg-danger-500/10 border-danger-500/50 mb-4">
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
                <CheckCircle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-success-300 mb-4">Replacement Started</h2>
                <p className="text-sm text-slate-400 mb-4">
                  An OTP has been sent to your email. Please verify it to complete the device replacement.
                </p>
                <div className="space-y-2 mb-4">
                  {Object.entries(success as Record<string, unknown>).map(([key, value]) => {
                    if (key === "LoginChallengeId") return null;
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
                <button
                  onClick={handleContinue}
                  className="btn w-full"
                >
                  Continue to OTP Verification
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Info Card */}
            <div className="card p-4 bg-primary-500/5 border-primary-500/20 mb-6">
              <div className="flex items-start gap-3">
                <Smartphone className="h-5 w-5 text-primary-400 mt-0.5" />
                <div className="text-sm text-slate-400">
                  <p className="font-medium text-slate-300 mb-1">Instructions</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-500">
                    <li>Enter your Device Replacement Request ID</li>
                    <li>Enter your current password or temporary password</li>
                    <li>Click "Start Replacement" to receive OTP</li>
                    <li>Verify OTP to bind your new device</li>
                  </ol>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Request ID */}
              <div>
                <label className="label">Device Replacement Request ID <span className="text-danger-400">*</span></label>
                <input
                  type="text"
                  value={formData.DeviceReplacementRequestId}
                  onChange={(e) => handleInputChange("DeviceReplacementRequestId", e.target.value)}
                  placeholder="Enter your Request ID"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  This was provided when you submitted your replacement request
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="label">Password <span className="text-danger-400">*</span></label>
                <input
                  type="password"
                  value={formData.CurrentPasswordOrTemporaryPassword}
                  onChange={(e) => handleInputChange("CurrentPasswordOrTemporaryPassword", e.target.value)}
                  placeholder="Enter your current or temporary password"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use your current password or the temporary password if you haven't completed first access
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn w-full"
                disabled={loading}
              >
                {loading ? "Starting..." : "Start Replacement"}
              </button>
            </form>

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <button
                onClick={() => router.push("/login")}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 inline mr-1" />
                Back to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function DeviceReplacementStartPage() {
  return <DeviceReplacementStartContent />;
}
