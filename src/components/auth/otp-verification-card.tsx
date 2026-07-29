"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, KeyRound, Copy } from "lucide-react";
import toast from "react-hot-toast";

interface OtpVerificationCardProps {
  title: string;
  description: string;
  email?: string;
  challengeId?: string;
  otpCode: string;
  onOtpCodeChange: (value: string) => void;
  expiresAtUtc?: string | null;
  resendAvailableAtUtc?: string | null;
  resendCooldownSeconds?: number;
  verifying: boolean;
  resending: boolean;
  verifyButtonText?: string;
  resendButtonText?: string;
  onVerify: () => void;
  onResend?: () => void;
  onBack?: () => void;
  errorMessage?: string | null;
  showChallengeId?: boolean;
  onCopyChallengeId?: () => void;
}

export default function OtpVerificationCard({
  title,
  description,
  email,
  challengeId,
  otpCode,
  onOtpCodeChange,
  expiresAtUtc,
  resendAvailableAtUtc,
  resendCooldownSeconds = 60,
  verifying,
  resending,
  verifyButtonText = "Verify OTP",
  resendButtonText = "Resend OTP",
  onVerify,
  onResend,
  onBack,
  errorMessage,
  showChallengeId = false,
  onCopyChallengeId,
}: OtpVerificationCardProps) {
  const [otpExpired, setOtpExpired] = useState(false);
  const [otpTimeRemaining, setOtpTimeRemaining] = useState("");
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // OTP expiry countdown effect
  useEffect(() => {
    if (!expiresAtUtc) {
      setOtpTimeRemaining("");
      setOtpExpired(false);
      return;
    }

    const expiresAt = new Date(expiresAtUtc);
    const interval = setInterval(() => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setOtpExpired(true);
        setOtpTimeRemaining("Expired");
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setOtpTimeRemaining(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAtUtc]);

  // Resend cooldown countdown effect
  useEffect(() => {
    if (!resendAvailableAtUtc) {
      setResendCooldown(0);
      setCanResendOtp(true);
      return;
    }

    const resendAt = new Date(resendAvailableAtUtc);
    const interval = setInterval(() => {
      const now = new Date();
      const diff = resendAt.getTime() - now.getTime();

      if (diff <= 0) {
        setCanResendOtp(true);
        setResendCooldown(0);
      } else {
        setCanResendOtp(false);
        setResendCooldown(Math.ceil(diff / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [resendAvailableAtUtc]);

  const handleResend = () => {
    if (resending) {
      return; // Prevent duplicate calls while resending
    }
    if (!canResendOtp || resendCooldown > 0) {
      toast.error(`Please wait ${resendCooldown}s before requesting another OTP.`);
      return;
    }
    onResend?.();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="p-4 bg-danger-500/10 border border-danger-500/50 rounded-lg">
          <p className="text-sm text-danger-200">{errorMessage}</p>
        </div>
      )}

      {otpExpired && (
        <div className="p-4 bg-danger-500/10 border border-danger-500/20 rounded-lg">
          <p className="text-danger-400 text-sm">
            OTP expired. Please request a new OTP.
          </p>
        </div>
      )}

      {showChallengeId && challengeId && (
        <div className="card p-4 bg-slate-800/50">
          <label className="label">Login Challenge ID</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={challengeId}
              readOnly
              className="flex-1 bg-slate-900/50 text-xs"
            />
            <button
              type="button"
              onClick={() => onCopyChallengeId?.() || copyToClipboard(challengeId, "Challenge ID")}
              className="btn-ghost p-2"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {otpTimeRemaining && !otpExpired && (
        <div className="text-center">
          <p className="text-xs text-slate-400">
            OTP expires in <span className="text-primary-400 font-medium">{otpTimeRemaining}</span>
          </p>
        </div>
      )}

      <div>
        <label className="label">OTP Code</label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={otpCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 6);
              onOtpCodeChange(value);
            }}
            placeholder="Enter 6-digit OTP"
            className="pl-10 w-full text-center text-2xl tracking-widest"
            maxLength={6}
            required
            disabled={verifying || otpExpired}
          />
        </div>
        {email && (
          <p className="text-xs text-slate-500 mt-2">
            Sent to: {email}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="btn-secondary flex-1"
            disabled={verifying}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}
        {onResend && (
          <button
            type="button"
            onClick={handleResend}
            className="btn-secondary flex-1"
            disabled={verifying || resending || !canResendOtp}
          >
            {resending ? "Sending..." : canResendOtp ? resendButtonText : `Resend (${resendCooldown}s)`}
          </button>
        )}
        <button
          type="button"
          onClick={onVerify}
          className="btn flex-1"
          disabled={verifying || otpExpired || otpCode.length !== 6}
        >
          {verifying ? "Verifying..." : verifyButtonText}
        </button>
      </div>
    </div>
  );
}
