"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Smartphone, ArrowLeft, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/src/lib/api/auth";
import type { VerifyDeviceReplacementOtpRequest } from "@/src/types/api";
import { FullPageLoading } from "@/src/components/full-page-loading";
import { buildDeviceContext } from "@/src/lib/device/device-context";
import { useAuthStore } from "@/src/store/auth-store";

function DeviceReplacementVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAccessToken, setUser } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  
  const requestId = searchParams.get("requestId") || "";
  const challengeId = searchParams.get("challengeId") || "";
  
  const [formData, setFormData] = useState<VerifyDeviceReplacementOtpRequest>({
    DeviceReplacementRequestId: requestId,
    LoginChallengeId: challengeId,
    OtpCode: ""
  });

  useEffect(() => {
    if (requestId) {
      setFormData(prev => ({ ...prev, DeviceReplacementRequestId: requestId }));
    }
    if (challengeId) {
      setFormData(prev => ({ ...prev, LoginChallengeId: challengeId }));
    }
  }, [requestId, challengeId]);

  const handleInputChange = (field: keyof VerifyDeviceReplacementOtpRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.OtpCode.trim()) {
      setError("OTP code is required");
      return;
    }
    if (formData.OtpCode.length !== 6) {
      setError("OTP code must be 6 digits");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await authApi.verifyDeviceReplacementOtp(formData);
      
      if (res.ok && res.raw) {
        setSuccess(res.raw);
        toast.success("Device replacement completed successfully");
        
        // Store auth data if returned
        const response = res.raw as Record<string, unknown>;
        if (response.AccessToken || response.accessToken) {
          const token = response.AccessToken as string || response.accessToken as string;
          const expiresAt = response.ExpiresAtUtc as string || response.expiresAtUtc as string;
          const user = response.User;
          
          setAccessToken(token, expiresAt);
          if (user) {
            setUser(user);
          }
          
          // Redirect based on role after a short delay
          setTimeout(() => {
            router.push("/dashboard");
          }, 1500);
        }
      } else {
        if (res.raw && typeof res.raw === 'object') {
          const rawErrors = res.raw as Record<string, unknown>;
          setError(rawErrors.message as string || "Failed to verify OTP");
        } else {
          setError("Failed to verify OTP");
        }
        toast.error("Failed to verify OTP");
      }
    } catch (err) {
      setError("An error occurred");
      toast.error("Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!formData.LoginChallengeId) {
      setError("No active challenge found. Please start the replacement process again.");
      return;
    }

    setResending(true);
    setError(null);

    try {
      const res = await authApi.resendDeviceReplacementOtp({ LoginChallengeId: formData.LoginChallengeId, Device: buildDeviceContext() });
      
      if (res.ok) {
        toast.success("OTP resent successfully");
      } else {
        setError("Failed to resend OTP");
        toast.error("Failed to resend OTP");
      }
    } catch (err) {
      setError("An error occurred");
      toast.error("Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  const handleBackToStart = () => {
    router.push("/auth/device-replacement/start");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="p-4 rounded-full bg-primary-500/10 text-primary-400 mx-auto mb-4">
            <Smartphone className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Verify OTP</h1>
          <p className="text-slate-400 text-sm">Enter the OTP sent to your email</p>
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
                <h2 className="text-lg font-semibold text-success-300 mb-4">Device Replacement Complete</h2>
                <p className="text-sm text-slate-400 mb-4">
                  Your new device has been successfully bound to your account. Redirecting to your dashboard...
                </p>
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
                    <li>Check your email for the 6-digit OTP code</li>
                    <li>Enter the OTP code below</li>
                    <li>Click "Verify" to complete device replacement</li>
                    <li>If OTP expires, click "Resend OTP"</li>
                  </ol>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Request ID (Read-only if provided) */}
              {requestId && (
                <div>
                  <label className="label">Request ID</label>
                  <input
                    type="text"
                    value={formData.DeviceReplacementRequestId}
                    onChange={(e) => handleInputChange("DeviceReplacementRequestId", e.target.value)}
                    placeholder="Enter Request ID"
                    required
                  />
                </div>
              )}

              {/* Challenge ID (Read-only if provided) */}
              {challengeId && (
                <div>
                  <label className="label">Challenge ID</label>
                  <input
                    type="text"
                    value={formData.LoginChallengeId}
                    readOnly
                    className="bg-slate-900/50"
                  />
                </div>
              )}

              {/* OTP Code */}
              <div>
                <label className="label">OTP Code <span className="text-danger-400">*</span></label>
                <input
                  type="text"
                  value={formData.OtpCode}
                  onChange={(e) => handleInputChange("OtpCode", e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  required
                  className="text-center text-2xl tracking-widest"
                />
                <p className="text-xs text-slate-500 mt-1 text-center">
                  Enter the 6-digit code sent to your email
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn w-full"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              {/* Resend OTP */}
              <button
                type="button"
                onClick={handleResendOtp}
                className="btn btn-secondary w-full"
                disabled={resending || !formData.LoginChallengeId}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${resending ? 'animate-spin' : ''}`} />
                {resending ? "Resending..." : "Resend OTP"}
              </button>
            </form>

            {/* Back to Start */}
            <div className="mt-6 text-center">
              <button
                onClick={handleBackToStart}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 inline mr-1" />
                Back to Start
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function DeviceReplacementVerifyPage() {
  return (
    <Suspense fallback={<FullPageLoading message="Loading..." />}>
      <DeviceReplacementVerifyContent />
    </Suspense>
  );
}
