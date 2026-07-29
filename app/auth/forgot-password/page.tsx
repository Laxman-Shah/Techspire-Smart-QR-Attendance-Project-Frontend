"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  KeyRound,
  Lock,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";

import { authApi } from "@/src/lib/api/auth";
import {
  extractRestrictedToken,
  extractOtpExpiresAt,
  extractNextResendAllowedAt,
  extractRemainingResends,
  extractChallengeExpiresAt,
} from "@/src/lib/api/extractors";
import { ResponseViewer } from "@/src/components/response-viewer";
import { buildDeviceContext } from "@/src/lib/device/device-context";

type PasswordResetStep = "request" | "otp" | "reset";

export default function PasswordResetPage() {
  const [step, setStep] = useState<PasswordResetStep>("request");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [loginChallengeId, setLoginChallengeId] = useState("");
  const [otp, setOtp] = useState("");
  const [restrictedToken, setRestrictedToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [lastResponse, setLastResponse] = useState<unknown>(null);

  // Resend OTP state
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [nextResendAllowedAt, setNextResendAllowedAt] =
    useState<Date | null>(null);
  const [remainingResends, setRemainingResends] =
    useState<number | null>(null);
  const [maxResendsReached, setMaxResendsReached] = useState(false);

  // Challenge expiry state
  const [challengeExpiresAt, setChallengeExpiresAt] =
    useState<Date | null>(null);
  const [challengeExpired, setChallengeExpired] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");

  // OTP expiry state
  const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(null);
  const [otpExpired, setOtpExpired] = useState(false);
  const [otpTimeRemaining, setOtpTimeRemaining] = useState("");

  // Challenge expiry countdown
  useEffect(() => {
    if (!challengeExpiresAt) {
      setTimeRemaining("");
      setChallengeExpired(false);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const difference = challengeExpiresAt.getTime() - now.getTime();

      if (difference <= 0) {
        setChallengeExpired(true);
        setTimeRemaining("Expired");
        return;
      }

      const minutes = Math.floor(difference / 60000);
      const seconds = Math.floor((difference % 60000) / 1000);

      setTimeRemaining(
        `${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`
      );
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(interval);
  }, [challengeExpiresAt]);

  // OTP expiry countdown
  useEffect(() => {
    if (!otpExpiresAt) {
      setOtpTimeRemaining("");
      setOtpExpired(false);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const difference = otpExpiresAt.getTime() - now.getTime();

      if (difference <= 0) {
        setOtpExpired(true);
        setOtpTimeRemaining("Expired");
        return;
      }

      const minutes = Math.floor(difference / 60000);
      const seconds = Math.floor((difference % 60000) / 1000);

      setOtpTimeRemaining(
        `${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`
      );
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(interval);
  }, [otpExpiresAt]);

  // Resend OTP cooldown countdown
  useEffect(() => {
    if (!nextResendAllowedAt) {
      setResendCooldown(0);
      setCanResendOtp(true);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const difference = nextResendAllowedAt.getTime() - now.getTime();

      if (difference <= 0) {
        setCanResendOtp(true);
        setResendCooldown(0);
        return;
      }

      setCanResendOtp(false);
      setResendCooldown(Math.ceil(difference / 1000));
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(interval);
  }, [nextResendAllowedAt]);

  const showValidationErrors = (rawResponse: unknown) => {
    if (!rawResponse || typeof rawResponse !== "object") {
      return;
    }

    const response = rawResponse as {
      errors?: Record<string, unknown>;
    };

    if (!response.errors) {
      return;
    }

    Object.entries(response.errors).forEach(([field, messages]) => {
      const message = Array.isArray(messages)
        ? messages.join(", ")
        : String(messages);

      toast.error(`${field}: ${message}`);
    });
  };

  const handleStartOver = () => {
    setStep("request");
    setLoginChallengeId("");
    setOtp("");
    setRestrictedToken("");
    setNewPassword("");
    setConfirmPassword("");
    setLastResponse(null);

    setCanResendOtp(true);
    setResendCooldown(0);
    setNextResendAllowedAt(null);
    setRemainingResends(null);
    setMaxResendsReached(false);

    setChallengeExpiresAt(null);
    setChallengeExpired(false);
    setTimeRemaining("");

    setOtpExpiresAt(null);
    setOtpExpired(false);
    setOtpTimeRemaining("");

    toast.success("Starting over. Please enter your email.");
  };

  const handleStep1 = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      toast.error("Please enter your email");
      return;
    }

    setLoginChallengeId("");
    setOtp("");
    setRestrictedToken("");
    setNewPassword("");
    setConfirmPassword("");
    setLastResponse(null);

    setCanResendOtp(true);
    setResendCooldown(0);
    setNextResendAllowedAt(null);
    setRemainingResends(null);
    setMaxResendsReached(false);

    setChallengeExpiresAt(null);
    setChallengeExpired(false);
    setTimeRemaining("");

    setOtpExpiresAt(null);
    setOtpExpired(false);
    setOtpTimeRemaining("");

    setLoading(true);

    try {
      const deviceContext = buildDeviceContext();

      const response = await authApi.forgotPassword({
        Email: normalizedEmail,
        Device: deviceContext,
      });

      setLastResponse(response.raw);

      if (response.ok && response.raw) {
        const responseData = response.raw as Record<string, unknown>;

        const possibleChallengeId =
          responseData.LoginChallengeId ??
          responseData.loginChallengeId ??
          responseData.ChallengeId ??
          responseData.challengeId;

        const challengeId =
          typeof possibleChallengeId === "string" ? possibleChallengeId : "";

        if (!challengeId) {
          toast.error("No challenge ID was found in the response");
          return;
        }

        setLoginChallengeId(challengeId);

        const expiresAt = extractChallengeExpiresAt(response.raw);
        if (expiresAt) {
          setChallengeExpiresAt(new Date(expiresAt));
          setChallengeExpired(false);
        }

        const otpExpiry = extractOtpExpiresAt(response.raw);
        if (otpExpiry) {
          setOtpExpiresAt(new Date(otpExpiry));
          setOtpExpired(false);
        } else {
          const defaultOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
          setOtpExpiresAt(defaultOtpExpiry);
          setOtpExpired(false);
        }

        setNextResendAllowedAt(new Date(Date.now() + 60 * 1000));

        setStep("otp");
        toast.success("OTP sent to your email");
      } else {
        const responseData = response.raw as
          | { message?: string; title?: string }
          | undefined;

        const message =
          responseData?.message ??
          responseData?.title ??
          `Password reset request failed: ${response.status}`;

        toast.error(message);
        showValidationErrors(response.raw);
      }
    } catch (error) {
      console.error("Forgot-password request failed:", error);
      toast.error("An error occurred while requesting password reset");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResendOtp || resendCooldown > 0) {
      toast.error(
        `Please wait ${resendCooldown}s before requesting another OTP.`
      );
      return;
    }

    if (maxResendsReached) {
      toast.error(
        "Maximum resend limit reached. Please wait 15 minutes or start again."
      );
      return;
    }

    if (!loginChallengeId) {
      toast.error("No active challenge. Please start over.");
      return;
    }

    if (challengeExpired) {
      toast.error("The verification session expired. Please start again.");
      return;
    }

    setLoading(true);

    try {
      const deviceContext = buildDeviceContext();

      const response = await authApi.resendOtp({
        LoginChallengeId: loginChallengeId,
        Device: deviceContext,
      });

      setLastResponse(response.raw);

      if (response.ok) {
        setOtp("");

        const remaining = extractRemainingResends(response.raw);
        if (remaining !== null) {
          setRemainingResends(remaining);
          if (remaining <= 0) {
            setMaxResendsReached(true);
            setCanResendOtp(false);
          }
        }

        const newOtpExpiry = extractOtpExpiresAt(response.raw);
        if (newOtpExpiry) {
          setOtpExpiresAt(new Date(newOtpExpiry));
          setOtpExpired(false);
        } else {
          const defaultOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
          setOtpExpiresAt(defaultOtpExpiry);
          setOtpExpired(false);
        }

        const nextAllowed = extractNextResendAllowedAt(response.raw);
        if (nextAllowed) {
          setNextResendAllowedAt(new Date(nextAllowed));
        } else {
          setNextResendAllowedAt(new Date(Date.now() + 60 * 1000));
        }

        toast.success("New OTP sent. The previous OTP is no longer valid.");
        return;
      }

      if (response.status === 429) {
        const rawResponse = response.raw as
          | { retryAfterSeconds?: number }
          | undefined;

        const retryAfterHeader = response.headers?.["retry-after"];
        const parsedRetryAfter = Number(retryAfterHeader);

        const retryAfter =
          Number.isFinite(parsedRetryAfter) && parsedRetryAfter > 0
            ? parsedRetryAfter
            : rawResponse?.retryAfterSeconds ?? 60;

        setNextResendAllowedAt(new Date(Date.now() + retryAfter * 1000));

        toast.error(`Too many requests. Try again in ${retryAfter} seconds.`);
        return;
      }

      const responseData = response.raw as
        | {
            message?: string;
            title?: string;
            errors?: Record<string, unknown>;
          }
        | undefined;

      const deviceError =
        responseData?.errors?.["Device.InstallationIdentifier"];

      if (response.status === 400 && deviceError) {
        toast.error("Device validation failed. Please refresh the page.");
        showValidationErrors(response.raw);
        return;
      }

      const errorMessage = responseData?.message ?? responseData?.title ?? "";
      const normalizedError = errorMessage.toLowerCase();

      if (
        normalizedError.includes("maximum") ||
        normalizedError.includes("limit") ||
        normalizedError.includes("exceeded")
      ) {
        setMaxResendsReached(true);
        setCanResendOtp(false);
        toast.error(
          "Maximum OTP resend limit reached. Please wait 15 minutes."
        );
      } else {
        toast.error(
          errorMessage || `Failed to resend OTP: ${response.status}`
        );
      }

      showValidationErrors(response.raw);
    } catch (error) {
      console.error("Resend OTP failed:", error);
      toast.error("An error occurred while resending the OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedOtp = otp.trim();

    if (!loginChallengeId || !normalizedOtp) {
      toast.error("Please fill in all fields");
      return;
    }

    if (challengeExpired) {
      toast.error("The verification session expired. Please start again.");
      return;
    }

    if (otpExpired) {
      toast.error("The OTP expired. Please request a new OTP.");
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.verifyPasswordResetOtp({
        LoginChallengeId: loginChallengeId,
        OtpCode: normalizedOtp,
      });

      setLastResponse(response.raw);

      if (response.ok && response.raw) {
        const restricted = extractRestrictedToken(response.raw);

        if (!restricted) {
          toast.error("No restricted authorization token was returned.");
          return;
        }

        setRestrictedToken(restricted);
        setStep("reset");
        toast.success("OTP verified. Set your new password.");
      } else {
        const responseData = response.raw as
          | { message?: string; title?: string }
          | undefined;

        toast.error(
          responseData?.message ??
            responseData?.title ??
            `OTP verification failed: ${response.status}`
        );

        showValidationErrors(response.raw);
      }
    } catch (error) {
      console.error("OTP verification failed:", error);
      toast.error("An error occurred while verifying the OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !loginChallengeId ||
      !restrictedToken ||
      !newPassword ||
      !confirmPassword
    ) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 12 || newPassword.length > 128) {
      toast.error("Password must be 12-128 characters");
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      toast.error("Password must contain at least one uppercase letter");
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      toast.error("Password must contain at least one lowercase letter");
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      toast.error("Password must contain at least one number");
      return;
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      toast.error("Password must contain at least one special character");
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.resetPassword({
        LoginChallengeId: loginChallengeId,
        RestrictedAuthorizationToken: restrictedToken,
        NewPassword: newPassword,
        ConfirmPassword: confirmPassword,
      });

      setLastResponse(response.raw);

      if (response.ok) {
        toast.success(
          "Password reset successfully. Please login with your new password."
        );

        window.setTimeout(() => {
          window.location.href = "/login";
        }, 2000);

        return;
      }

      const responseData = response.raw as
        | { message?: string; title?: string }
        | undefined;

      toast.error(
        responseData?.message ??
          responseData?.title ??
          `Password reset failed: ${response.status}`
      );

      showValidationErrors(response.raw);
    } catch (error) {
      console.error("Password reset failed:", error);
      toast.error("An error occurred while resetting the password");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch (error) {
      console.error("Copy failed:", error);
      toast.error(`Unable to copy ${label}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 mb-4">
              <Lock className="h-8 w-8 text-primary-400" />
            </div>

            <h1 className="text-2xl font-bold mb-2">Reset Password</h1>

            <p className="text-slate-400 text-sm">
              Secure password recovery with OTP verification
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-8">
            <StepIndicator
              number={1}
              active={step === "request"}
              completed={step !== "request"}
            />

            <div className="w-8 h-0.5 bg-slate-700" />

            <StepIndicator
              number={2}
              active={step === "otp"}
              completed={step === "reset"}
            />

            <div className="w-8 h-0.5 bg-slate-700" />

            <StepIndicator
              number={3}
              active={step === "reset"}
              completed={false}
            />
          </div>

          {step === "request" && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="label">Email Address</label>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email"
                    className="pl-10 w-full"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn w-full" disabled={loading}>
                {loading ? (
                  "Sending OTP..."
                ) : (
                  <>
                    Send Reset Link
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleStep2} className="space-y-4">
              {challengeExpired && (
                <div className="card p-4 bg-danger-500/10 border-danger-500/20">
                  <p className="text-danger-400 text-sm">
                    Verification session expired. Please start again.
                  </p>
                </div>
              )}

              {otpExpired && !challengeExpired && (
                <div className="card p-4 bg-warning-500/10 border-warning-500/20">
                  <p className="text-warning-400 text-sm">
                    The OTP expired. Please request a new OTP.
                  </p>
                </div>
              )}

              {maxResendsReached && (
                <div className="card p-4 bg-warning-500/10 border-warning-500/20">
                  <p className="text-warning-400 text-sm">
                    Maximum OTP resend limit reached. Please wait 15 minutes
                    before trying again.
                  </p>
                </div>
              )}

              <div className="card p-4 bg-slate-800/50">
                <label className="label">Login Challenge ID</label>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={loginChallengeId}
                    readOnly
                    className="flex-1 bg-slate-900/50 text-xs"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      void copyToClipboard(loginChallengeId, "Challenge ID")
                    }
                    className="btn-ghost p-2"
                    aria-label="Copy challenge ID"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {timeRemaining && !challengeExpired && (
                <div className="text-center">
                  <p className="text-xs text-slate-400">
                    Session expires in{" "}
                    <span className="text-primary-400 font-medium">
                      {timeRemaining}
                    </span>
                  </p>
                </div>
              )}

              {otpTimeRemaining && !otpExpired && (
                <div className="text-center">
                  <p className="text-xs text-slate-400">
                    OTP expires in{" "}
                    <span className="text-primary-400 font-medium">
                      {otpTimeRemaining}
                    </span>
                  </p>
                </div>
              )}

              {remainingResends !== null && (
                <div className="text-center">
                  <p className="text-xs text-slate-400">
                    Remaining OTP resends:{" "}
                    <span className="text-primary-400 font-medium">
                      {remainingResends}
                    </span>
                  </p>
                </div>
              )}

              <div>
                <label className="label">OTP Code</label>

                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />

                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(event) => {
                      const numericOtp = event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6);

                      setOtp(numericOtp);
                    }}
                    placeholder="Enter 6-digit OTP"
                    className="pl-10 w-full"
                    maxLength={6}
                    autoComplete="one-time-code"
                    required
                    disabled={challengeExpired}
                  />
                </div>

                <p className="text-xs text-slate-500 mt-2">
                  Check your email for the OTP code
                </p>
              </div>

              <div className="flex gap-3">
                {maxResendsReached || challengeExpired ? (
                  <button
                    type="button"
                    onClick={handleStartOver}
                    className="btn w-full"
                  >
                    Start Over
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setStep("request")}
                      className="btn-secondary flex-1"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleResendOtp()}
                      className="btn-secondary flex-1"
                      disabled={loading || !canResendOtp || resendCooldown > 0}
                    >
                      {loading
                        ? "Sending..."
                        : canResendOtp
                        ? "Resend OTP"
                        : `Resend (${resendCooldown}s)`}
                    </button>

                    <button
                      type="submit"
                      className="btn flex-1"
                      disabled={loading || challengeExpired || otpExpired}
                    >
                      {loading ? "Verifying..." : "Verify OTP"}
                    </button>
                  </>
                )}
              </div>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleStep3} className="space-y-4">
              <div className="card p-4 bg-success-500/10 border-success-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-success-500" />

                  <span className="text-success-400 font-medium">
                    OTP Verified
                  </span>
                </div>

                <p className="text-sm text-slate-400">
                  Set your new password to complete the reset.
                </p>
              </div>

              {restrictedToken && (
                <div className="card p-4 bg-slate-800/50">
                  <label className="label">
                    Restricted Authorization Token
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={restrictedToken}
                      readOnly
                      className="flex-1 bg-slate-900/50 text-xs"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        void copyToClipboard(restrictedToken, "Token")
                      }
                      className="btn-ghost p-2"
                      aria-label="Copy restricted token"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="label">New Password</label>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />

                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="12+ chars, uppercase, lowercase, number, special"
                    className="pl-10 pr-10 w-full"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={128}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-500 mt-2">
                  Must be 12-128 characters with uppercase, lowercase, number,
                  and special character
                </p>
              </div>

              <div>
                <label className="label">Confirm New Password</label>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />

                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    placeholder="Confirm new password"
                    className="pl-10 pr-10 w-full"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={128}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirmed password"
                        : "Show confirmed password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("otp")}
                  className="btn-secondary flex-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>

                <button
                  type="submit"
                  className="btn flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    "Resetting..."
                  ) : (
                    <>
                      Reset Password
                      <CheckCircle2 className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-slate-800">
            <Link
              href="/login"
              className="block text-sm text-center text-slate-400 hover:text-primary-400 transition-colors"
            >
              Remember your password? Login instead
            </Link>
          </div>

          {lastResponse !== null && (
            <div className="mt-6">
              <ResponseViewer
                data={lastResponse as Record<string, unknown>}
                title="API Response"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({
  number,
  active,
  completed,
}: {
  number: number;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div
      className={`
      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
      ${
        active
          ? "bg-primary-500 text-white"
          : completed
          ? "bg-success-500 text-white"
          : "bg-slate-800 text-slate-500"
      }
    `}
    >
      {completed ? <CheckCircle2 className="h-4 w-4" /> : number}
    </div>
  );
}
