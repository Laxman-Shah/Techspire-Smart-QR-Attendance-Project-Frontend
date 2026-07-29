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
  EyeOff
} from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/src/lib/api/auth";
import {
  extractRestrictedToken,
  extractOtpExpiresAt,
  extractNextResendAllowedAt,
  extractRemainingResends,
  extractChallengeExpiresAt
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
      const difference =
        challengeExpiresAt.getTime() - now.getTime();

      if (difference <= 0) {
        setChallengeExpired(true);
        setTimeRemaining("Expired");
      } else {
        const minutes = Math.floor(difference / 60000);
        const seconds = Math.floor(
          (difference % 60000) / 1000
        );

        setTimeRemaining(
          `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`
        );
      }
    };

    updateCountdown();

    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
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
      } else {
        const minutes = Math.floor(difference / 60000);
        const seconds = Math.floor(
          (difference % 60000) / 1000
        );

        setOtpTimeRemaining(
          `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`
        );
      }
    };

    updateCountdown();

    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [otpExpiresAt]);

  // Resend cooldown countdown
  useEffect(() => {
    if (!nextResendAllowedAt) {
      setResendCooldown(0);
      setCanResendOtp(true);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const difference =
        nextResendAllowedAt.getTime() - now.getTime();

      if (difference <= 0) {
        setCanResendOtp(true);
        setResendCooldown(0);
      } else {
        setCanResendOtp(false);
        setResendCooldown(Math.ceil(difference / 1000));
      }
    };

    updateCountdown();

    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextResendAllowedAt]);

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
    setOtpExpiresAt(null);
    setOtpExpired(false);

    toast.success("Starting over. Please enter your email.");
  };

  const handleStep1 = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    // Clear old state
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
    setOtpExpiresAt(null);
    setOtpExpired(false);

    setLoading(true);

    try {
      const deviceContext = buildDeviceContext();

      const result = await authApi.forgotPassword({
        Email: email.trim(),
        Device: deviceContext
      });

      setLastResponse(result.raw);

      if (result.ok && result.raw) {
        const response = result.raw as Record<string, unknown>;

        const challengeId =
          response.LoginChallengeId ||
          response.loginChallengeId ||
          response.ChallengeId ||
          response.challengeId;

        if (typeof challengeId === "string" && challengeId) {
          setLoginChallengeId(challengeId);

          const expiresAt = extractChallengeExpiresAt(result.raw);

          if (expiresAt) {
            setChallengeExpiresAt(new Date(expiresAt));
            setChallengeExpired(false);
          }

          const otpExpires = extractOtpExpiresAt(result.raw);

          if (otpExpires) {
            setOtpExpiresAt(new Date(otpExpires));
            setOtpExpired(false);
          } else {
            const defaultExpiry = new Date(
              Date.now() + 10 * 60 * 1000
            );

            setOtpExpiresAt(defaultExpiry);
            setOtpExpired(false);
          }

          setNextResendAllowedAt(
            new Date(Date.now() + 60 * 1000)
          );

          setStep("otp");
          toast.success("OTP sent to your email");
        } else {
          toast.error("No challenge ID was found in the response");
        }
      } else {
        const rawResponse = result.raw as
          | {
              message?: string;
              title?: string;
              errors?: Record<string, unknown>;
            }
          | undefined;

        const message =
          rawResponse?.message ||
          rawResponse?.title ||
          `Password reset request failed: ${result.status}`;

        toast.error(message);

        if (rawResponse?.errors) {
          Object.entries(rawResponse.errors).forEach(
            ([field, messages]) => {
              const validationMessage = Array.isArray(messages)
                ? messages.join(", ")
                : String(messages);

              toast.error(`${field}: ${validationMessage}`);
            }
          );
        }
      }
    } catch (error) {
      console.error("Forgot password request failed:", error);
      toast.error(
        "An error occurred while requesting password reset"
      );
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

    setLoading(true);

    try {
      const deviceContext = buildDeviceContext();

      const result = await authApi.resendOtp({
        LoginChallengeId: loginChallengeId,
        Device: deviceContext
      });

      setLastResponse(result.raw);

      if (result.ok) {
        setOtp("");

        const remaining = extractRemainingResends(result.raw);

        if (remaining !== null) {
          setRemainingResends(remaining);
        }

        const newOtpExpires = extractOtpExpiresAt(result.raw);

        if (newOtpExpires) {
          setOtpExpiresAt(new Date(newOtpExpires));
          setOtpExpired(false);
        } else {
          const defaultExpiry = new Date(
            Date.now() + 10 * 60 * 1000
          );

          setOtpExpiresAt(defaultExpiry);
          setOtpExpired(false);
        }

        const nextAllowed =
          extractNextResendAllowedAt(result.raw);

        if (nextAllowed) {
          setNextResendAllowedAt(new Date(nextAllowed));
        } else {
          setNextResendAllowedAt(
            new Date(Date.now() + 60 * 1000)
          );
        }

        toast.success(
          "New OTP sent. The previous OTP is no longer valid. Use the latest OTP email."
        );
      } else if (result.status === 429) {
        const rawResponse = result.raw as
          | { retryAfterSeconds?: number }
          | undefined;

        const retryAfterHeader =
          result.headers?.["retry-after"];

        const parsedRetryAfter = retryAfterHeader
          ? Number(retryAfterHeader)
          : NaN;

        const retryAfter =
          Number.isFinite(parsedRetryAfter) &&
          parsedRetryAfter > 0
            ? parsedRetryAfter
            : rawResponse?.retryAfterSeconds || 60;

        toast.error(
          `Too many requests. Try again in ${retryAfter} seconds.`
        );

        setNextResendAllowedAt(
          new Date(Date.now() + retryAfter * 1000)
        );
      } else {
        const rawResponse = result.raw as
          | {
              message?: string;
              title?: string;
              errors?: Record<string, unknown>;
            }
          | undefined;

        const deviceErrors =
          rawResponse?.errors?.[
            "Device.InstallationIdentifier"
          ];

        if (result.status === 400 && deviceErrors) {
          toast.error(
            "Device validation failed. Please refresh the page."
          );
        } else {
          const errorMessage =
            rawResponse?.message ||
            rawResponse?.title ||
            "";

          const normalizedError = errorMessage.toLowerCase();

          if (
            normalizedError.includes("maximum") ||
            normalizedError.includes("limit") ||
            normalizedError.includes("exceeded")
          ) {
            setMaxResendsReached(true);
            setCanResendOtp(false);

            toast.error(
              "Maximum OTP resend limit reached. Please wait 15 minutes before trying again."
            );
          } else {
            toast.error(
              `Failed to resend OTP: ${result.status}`
            );
          }
        }

        if (rawResponse?.errors) {
          Object.entries(rawResponse.errors).forEach(
            ([field, messages]) => {
              const validationMessage = Array.isArray(messages)
                ? messages.join(", ")
                : String(messages);

              toast.error(`${field}: ${validationMessage}`);
            }
          );
        }
      }
    } catch (error) {
      console.error("Resend OTP failed:", error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!loginChallengeId || !otp.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (challengeExpired) {
      toast.error(
        "Verification session expired. Please start again."
      );
      return;
    }

    if (otpExpired) {
      toast.error(
        "OTP expired. Please request a new OTP."
      );
      return;
    }

    setLoading(true);

    try {
      const result = await authApi.verifyPasswordResetOtp({
        LoginChallengeId: loginChallengeId,
        OtpCode: otp.trim()
      });

      setLastResponse(result.raw);

      if (result.ok && result.raw) {
        const restricted = extractRestrictedToken(result.raw);

        if (!restricted) {
          toast.error(
            "No restricted authorization token was found in the response"
          );
          return;
        }

        setRestrictedToken(restricted);
        setStep("reset");

        toast.success(
          "OTP verified. Set your new password."
        );
      } else {
        toast.error(
          `OTP verification failed: ${result.status}`
        );

        const rawResponse = result.raw as
          | { errors?: Record<string, unknown> }
          | undefined;

        if (rawResponse?.errors) {
          Object.entries(rawResponse.errors).forEach(
            ([field, messages]) => {
              const validationMessage = Array.isArray(messages)
                ? messages.join(", ")
                : String(messages);

              toast.error(`${field}: ${validationMessage}`);
            }
          );
        }
      }
    } catch (error) {
      console.error("OTP verification failed:", error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async (event: React.FormEvent) => {
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

    if (
      newPassword.length < 12 ||
      newPassword.length > 128
    ) {
      toast.error("Password must be 12-128 characters");
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      toast.error(
        "Password must contain at least one uppercase letter"
      );
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      toast.error(
        "Password must contain at least one lowercase letter"
      );
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      toast.error(
        "Password must contain at least one number"
      );
      return;
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      toast.error(
        "Password must contain at least one special character"
      );
      return;
    }

    setLoading(true);

    try {
      const result = await authApi.resetPassword({
        LoginChallengeId: loginChallengeId,
        RestrictedAuthorizationToken: restrictedToken,
        NewPassword: newPassword,
        ConfirmPassword: confirmPassword
      });

      setLastResponse(result.raw);

      if (result.ok) {
        toast.success(
          "Password reset successfully. Please login with your new password."
        );

        window.setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else {
        toast.error(
          `Password reset failed: ${result.status}`
        );

        const rawResponse = result.raw as
          | { errors?: Record<string, unknown> }
          | undefined;

        if (rawResponse?.errors) {
          Object.entries(rawResponse.errors).forEach(
            ([field, messages]) => {
              const validationMessage = Array.isArray(messages)
                ? messages.join(", ")
                : String(messages);

              toast.error(`${field}: ${validationMessage}`);
            }
          );
        }
      }
    } catch (error) {
      console.error("Password reset failed:", error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (
    text: string,
    label: string
  ) => {
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
          /
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 mb-4">
              <Lock className="h-8 w-8 text-primary-400" />
            </div>

            <h1 className="text-2xl font-bold mb-2">
              Reset Password
            </h1>

            <p className="text-slate-400 text-sm">
              Secure password recovery with OTP verification
