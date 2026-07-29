"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { authApi } from "@/src/lib/api/auth";
import { buildDeviceContext } from "@/src/lib/device/device-context";
import toast from "react-hot-toast";
import OtpVerificationCard from "@/src/components/auth/otp-verification-card";

type Step = "email" | "otp" | "reset" | "success";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetChallengeId, setResetChallengeId] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [otpExpiresAtUtc, setOtpExpiresAtUtc] = useState<string | null>(null);
  const [nextResendAllowedAtUtc, setNextResendAllowedAtUtc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const clearErrors = () => {
    setErrorMessage(null);
    setFieldErrors({});
  };

  // Cooldown countdown effect
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const interval = setInterval(() => {
        setCooldownSeconds(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [cooldownSeconds]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (cooldownSeconds > 0) {
      return;
    }

    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const device = buildDeviceContext();
      const response = await authApi.forgotPassword({
        Email: email.trim(),
        Device: device,
      });

      if (response.ok && response.data) {
        const data = response.data as any;
        
        const challengeId = 
          data.loginChallengeId ?? 
          data.LoginChallengeId ?? 
          data.challengeId ?? 
          data.ChallengeId;

        const otpExpires = 
          data.otpExpiresAtUtc ?? 
          data.OtpExpiresAtUtc;

        const nextResend = 
          data.nextResendAllowedAtUtc ?? 
          data.NextResendAllowedAtUtc;

        if (challengeId) {
          setResetChallengeId(challengeId);
          clearErrors(); // Clear any previous errors when moving to OTP step
          
          // Fallback: if backend doesn't return timing, use defaults
          // OTP expires in 10 minutes, resend cooldown 60 seconds
          const now = new Date();
          const defaultOtpExpiry = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
          const defaultResendAllowed = new Date(now.getTime() + 60 * 1000).toISOString();
          
          setOtpExpiresAtUtc(otpExpires || defaultOtpExpiry);
          setNextResendAllowedAtUtc(nextResend || defaultResendAllowed);
          setStep("otp");
          toast.success("We sent a reset OTP to your email.");
        } else {
          setErrorMessage("Password reset challenge information was not returned by the server.");
        }
      } else if (response.status === 429) {
        const retryAfter = response.headers?.['retry-after'] || response.headers?.['Retry-After'];
        const cooldown = retryAfter ? parseInt(retryAfter, 10) : 60;
        setCooldownSeconds(cooldown);
        setErrorMessage("Too many password reset requests. Please wait before trying again.");
      } else {
        const errorData = response.data as any;
        const detail = errorData?.detail || errorData?.title || "Failed to send password reset email.";
        setErrorMessage(detail);
        
        if (errorData?.errors) {
          setFieldErrors(errorData.errors);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send password reset email.";
      setErrorMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    clearErrors();

    if (!otpCode || otpCode.length !== 6) {
      setErrorMessage("Please enter a valid 6-digit OTP code.");
      return;
    }

    if (!resetChallengeId) {
      setErrorMessage("Password reset challenge is missing. Please start over.");
      setStep("email");
      return;
    }

    setLoading(true);

    try {
      const device = buildDeviceContext();
      const response = await authApi.verifyPasswordResetOtp({
        LoginChallengeId: resetChallengeId,
        OtpCode: otpCode,
        Device: device,
      });

      if (response.ok && response.data) {
        const data = response.data as any;
        
        const token = 
          data.resetAuthorizationToken ?? 
          data.ResetAuthorizationToken ?? 
          data.resetToken ?? 
          data.ResetToken;

        if (token) {
          setResetToken(token);
          setStep("reset");
          toast.success("OTP verified. Please create your new password.");
        } else {
          setErrorMessage("Password reset authorization token was not returned by the server.");
        }
      } else {
        const errorData = response.data as any;
        const detail = errorData?.detail || errorData?.title || "Failed to verify OTP.";
        setErrorMessage(detail);
        
        if (errorData?.errors) {
          setFieldErrors(errorData.errors);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to verify OTP.";
      setErrorMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    clearErrors();
    setResending(true);

    try {
      const device = buildDeviceContext();
      const response = await authApi.resendPasswordResetOtp({
        LoginChallengeId: resetChallengeId!,
        Device: device,
      });

      if (response.ok && response.data) {
        const data = response.data as any;
        const otpExpires = 
          data.otpExpiresAtUtc ?? 
          data.OtpExpiresAtUtc;

        const nextResend = 
          data.nextResendAllowedAtUtc ?? 
          data.NextResendAllowedAtUtc;

        // Fallback: if backend doesn't return timing, use defaults
        const now = new Date();
        const defaultOtpExpiry = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
        const defaultResendAllowed = new Date(now.getTime() + 60 * 1000).toISOString();

        setOtpExpiresAtUtc(otpExpires || defaultOtpExpiry);
        setNextResendAllowedAtUtc(nextResend || defaultResendAllowed);
        setOtpCode("");
        toast.success("A new OTP has been sent to your email.");
      } else {
        const errorData = response.data as any;
        const detail = errorData?.detail || errorData?.title || "Failed to resend OTP.";
        setErrorMessage(detail);
        
        if (errorData?.errors) {
          setFieldErrors(errorData.errors);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to resend OTP.";
      setErrorMessage(errorMessage);
    } finally {
      setResending(false);
    }
  };

  const validatePassword = (password: string): boolean => {
    if (password.length < 12 || password.length > 128) {
      setErrorMessage("Password must be between 12 and 128 characters.");
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setErrorMessage("Password must contain at least one uppercase letter.");
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setErrorMessage("Password must contain at least one lowercase letter.");
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setErrorMessage("Password must contain at least one number.");
      return false;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setErrorMessage("Password must contain at least one special character.");
      return false;
    }
    return true;
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (!newPassword || !confirmPassword) {
      setErrorMessage("Please enter both password fields.");
      return;
    }

    if (!validatePassword(newPassword)) {
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!resetChallengeId || !resetToken) {
      setErrorMessage("Password reset verification data is missing. Please start over.");
      setStep("email");
      return;
    }

    setLoading(true);

    try {
      const device = buildDeviceContext();
      const response = await authApi.resetPassword({
        LoginChallengeId: resetChallengeId,
        ResetAuthorizationToken: resetToken,
        NewPassword: newPassword,
        ConfirmNewPassword: confirmPassword,
        Device: device,
      });

      if (response.ok) {
        setStep("success");
        toast.success("Password reset successfully. Please sign in with your new password.");
      } else {
        const errorData = response.data as any;
        const detail = errorData?.detail || errorData?.title || "Failed to reset password.";
        setErrorMessage(detail);
        
        if (errorData?.errors) {
          setFieldErrors(errorData.errors);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reset password.";
      setErrorMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    clearErrors();
  };

  const handleGoToLogin = () => {
    router.replace("/login");
  };

  const getFieldError = (fieldName: string) => {
    const errors = fieldErrors[fieldName];
    return errors && errors.length > 0 ? errors[0] : null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4">
      <div className="max-w-md w-full">
        <div className="mb-6">
          <Link href="/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </div>

        <div className="card p-8">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <StepIndicator number={1} active={step === "email"} completed={step !== "email"} />
            <div className="w-8 h-0.5 bg-slate-700" />
            <StepIndicator number={2} active={step === "otp"} completed={step === "reset" || step === "success"} />
            <div className="w-8 h-0.5 bg-slate-700" />
            <StepIndicator number={3} active={step === "reset" || step === "success"} completed={step === "success"} />
          </div>

          {/* Error Display - only for email step, OTP step has its own error display */}
          {step === "email" && errorMessage && (
            <div className="mb-6 p-4 bg-danger-500/10 border border-danger-500/50 rounded-lg">
              <p className="text-sm text-danger-200">{errorMessage}</p>
            </div>
          )}

          {/* Step 1: Email */}
          {step === "email" && (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 mb-4">
                  <Mail className="h-8 w-8 text-primary-400" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Forgot Password</h1>
                <p className="text-slate-400 text-sm">
                  Enter your email address and we will send a password reset OTP.
                </p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div>
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full"
                    disabled={loading}
                    required
                  />
                  {getFieldError("Email") && (
                    <p className="text-xs text-danger-400 mt-2">{getFieldError("Email")}</p>
                  )}
                </div>

                <button type="submit" className="btn w-full" disabled={loading || cooldownSeconds > 0}>
                  {loading ? "Sending..." : cooldownSeconds > 0 ? `Try again in ${cooldownSeconds}s` : "Send Reset OTP"}
                </button>
              </form>
            </>
          )}

          {/* Step 2: OTP */}
          {step === "otp" && (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 mb-4">
                  <Mail className="h-8 w-8 text-primary-400" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Verify Reset OTP</h1>
                <p className="text-slate-400 text-sm">
                  Enter the OTP sent to your email.
                </p>
              </div>

              <OtpVerificationCard
                title="Verify Reset OTP"
                description="Enter the OTP sent to your email."
                email={email}
                challengeId={resetChallengeId || undefined}
                otpCode={otpCode}
                onOtpCodeChange={setOtpCode}
                expiresAtUtc={otpExpiresAtUtc}
                resendAvailableAtUtc={nextResendAllowedAtUtc}
                verifying={loading}
                resending={resending}
                verifyButtonText="Verify OTP"
                resendButtonText="Resend OTP"
                onVerify={handleOtpSubmit}
                onResend={handleResendOtp}
                onBack={handleBackToEmail}
                errorMessage={errorMessage}
                showChallengeId={false}
              />
            </>
          )}

          {/* Step 3: Reset Password */}
          {step === "reset" && (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 mb-4">
                  <Lock className="h-8 w-8 text-primary-400" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Create New Password</h1>
                <p className="text-slate-400 text-sm">
                  Enter a new password for your account.
                </p>
              </div>

              <form onSubmit={handleResetSubmit} className="space-y-6">
                <div>
                  <label className="label">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pr-10"
                      disabled={loading}
                      required
                      minLength={12}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Must be 12-128 characters with uppercase, lowercase, number, and special character
                  </p>
                  {getFieldError("NewPassword") && (
                    <p className="text-xs text-danger-400 mt-2">{getFieldError("NewPassword")}</p>
                  )}
                </div>

                <div>
                  <label className="label">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full pr-10"
                      disabled={loading}
                      required
                      minLength={12}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {getFieldError("ConfirmNewPassword") && (
                    <p className="text-xs text-danger-400 mt-2">{getFieldError("ConfirmNewPassword")}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleBackToEmail}
                    className="btn-secondary flex-1"
                    disabled={loading}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button type="submit" className="btn flex-1" disabled={loading}>
                    {loading ? "Saving..." : "Save New Password"}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Step 4: Success */}
          {step === "success" && (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-500/10 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-success-500" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Password Reset Successful</h1>
                <p className="text-slate-400 text-sm">
                  Your password has been changed successfully. Please sign in with your new password.
                </p>
              </div>

              <button onClick={handleGoToLogin} className="btn w-full">
                Go to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ number, active, completed }: { number: number; active: boolean; completed: boolean }) {
  return (
    <div className={`
      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
      ${active ? 'bg-primary-500 text-white' : completed ? 'bg-success-500 text-white' : 'bg-slate-800 text-slate-500'}
    `}>
      {completed ? <CheckCircle2 className="h-4 w-4" /> : number}
    </div>
  );
}
