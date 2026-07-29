"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Lock, Mail, KeyRound, CheckCircle2, Copy, Eye, EyeOff, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/src/lib/api/auth";
import { extractAccessToken } from "@/src/lib/api/client";
import { extractChallengeId, extractRestrictedToken, extractOtpExpiresAt, extractNextResendAllowedAt, extractRemainingResends, extractChallengeExpiresAt } from "@/src/lib/api/extractors";
import { useAuthStore } from "@/src/store/auth-store";
import { ResponseViewer } from "@/src/components/response-viewer";
import { getUserRole } from "@/src/lib/auth/role";
import { buildDeviceContext } from "@/src/lib/device/device-context";

type FirstAccessStep = "credentials" | "otp" | "password";

export default function FirstAccessPage() {
  const router = useRouter();
  const { setAccessToken, setUser, clearAuth } = useAuthStore();
  const [step, setStep] = useState<FirstAccessStep>("credentials");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form state
  const [identifier, setIdentifier] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [loginChallengeId, setLoginChallengeId] = useState("");
  const [otp, setOtp] = useState("");
  const [restrictedToken, setRestrictedToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Response state
  const [lastResponse, setLastResponse] = useState<unknown>(null);
  
  // Resend OTP state
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [nextResendAllowedAt, setNextResendAllowedAt] = useState<Date | null>(null);
  const [remainingResends, setRemainingResends] = useState<number | null>(null);
  const [maxResendsReached, setMaxResendsReached] = useState(false);
  
  // Challenge expiry state
  const [challengeExpiresAt, setChallengeExpiresAt] = useState<Date | null>(null);
  const [challengeExpired, setChallengeExpired] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  
  // OTP expiry state (separate from challenge expiry)
  const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(null);
  const [otpExpired, setOtpExpired] = useState(false);
  const [otpTimeRemaining, setOtpTimeRemaining] = useState<string>("");

  // Challenge expiry countdown effect
  useEffect(() => {
    if (!challengeExpiresAt) {
      setTimeRemaining("");
      setChallengeExpired(false);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diff = challengeExpiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setChallengeExpired(true);
        setTimeRemaining("Expired");
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [challengeExpiresAt]);

  // OTP expiry countdown effect
  useEffect(() => {
    if (!otpExpiresAt) {
      setOtpTimeRemaining("");
      setOtpExpired(false);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diff = otpExpiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setOtpExpired(true);
        setOtpTimeRemaining("Expired");
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setOtpTimeRemaining(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [otpExpiresAt]);

  // Resend cooldown countdown effect (Date-based)
  useEffect(() => {
    if (!nextResendAllowedAt) {
      setResendCooldown(0);
      setCanResendOtp(true);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diff = nextResendAllowedAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCanResendOtp(true);
        setResendCooldown(0);
      } else {
        setCanResendOtp(false);
        setResendCooldown(Math.ceil(diff / 1000));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [nextResendAllowedAt]);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !temporaryPassword) {
      toast.error("Please fill in all fields");
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
      const res = await authApi.firstAccess({
        Identifier: identifier,
        Password: temporaryPassword,
        LoginContext: "FirstAccess",
        Device: deviceContext,
      });
      setLastResponse(res.raw);

      if (res.ok && res.raw) {
        const challengeId = extractChallengeId(res.raw);
        if (challengeId) {
          setLoginChallengeId(challengeId);
          
          // Set challenge expiry if backend provides it
          const expiresAt = extractChallengeExpiresAt(res.raw);
          if (expiresAt) {
            setChallengeExpiresAt(new Date(expiresAt));
            setChallengeExpired(false);
          }
          
          // Set OTP expiry if backend provides it
          const otpExpires = extractOtpExpiresAt(res.raw);
          if (otpExpires) {
            setOtpExpiresAt(new Date(otpExpires));
            setOtpExpired(false);
          } else {
            // Fallback to 10 minutes if backend doesn't provide OTP expiry
            const defaultExpiry = new Date(Date.now() + 10 * 60 * 1000);
            setOtpExpiresAt(defaultExpiry);
            setOtpExpired(false);
          }
          
          // Start resend cooldown timer immediately
          setNextResendAllowedAt(new Date(Date.now() + 60 * 1000));
          
          setStep("otp");
          toast.success("OTP sent. Continue with verification.");
        } else {
          toast.error("First access request succeeded but challenge ID could not be found. Check response shape in raw response panel.");
        }
      } else {
        toast.error(`First access failed: ${res.status}`);
        // Display validation errors if present
        if (res.raw && typeof res.raw === 'object') {
          const errors = (res.raw as any).errors;
          if (errors) {
            Object.entries(errors).forEach(([field, messages]) => {
              const msg = Array.isArray(messages) ? messages.join(', ') : messages;
              toast.error(`${field}: ${msg}`);
            });
          }
        }
      }
    } catch (error) {
      toast.error("An error occurred");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    // Guard: prevent backend call during cooldown
    if (!canResendOtp || resendCooldown > 0) {
      toast.error(`Please wait ${resendCooldown}s before requesting another OTP.`);
      return;
    }
    
    if (maxResendsReached) {
      toast.error("Maximum resend limit reached. Please wait 15 minutes or start again.");
      return;
    }

    if (!loginChallengeId) {
      toast.error("No active challenge. Please start over.");
      return;
    }

    setLoading(true);
    try {
      const deviceContext = buildDeviceContext();
      const res = await authApi.resendOtp({ 
        LoginChallengeId: loginChallengeId,
        Device: deviceContext
      });
      setLastResponse(res.raw);
      
      if (res.ok) {
        // Clear OTP input after successful resend
        setOtp("");
        
        // Update remaining resends if backend provides it
        const remaining = extractRemainingResends(res.raw);
        if (remaining !== null) {
          setRemainingResends(remaining);
        }
        
        // Reset OTP expiry from backend response
        const newOtpExpires = extractOtpExpiresAt(res.raw);
        if (newOtpExpires) {
          setOtpExpiresAt(new Date(newOtpExpires));
          setOtpExpired(false);
        } else {
          // Fallback to 10 minutes if backend doesn't provide OTP expiry
          const defaultExpiry = new Date(Date.now() + 10 * 60 * 1000);
          setOtpExpiresAt(defaultExpiry);
          setOtpExpired(false);
        }
        
        // Reset resend cooldown from backend response
        const nextAllowed = extractNextResendAllowedAt(res.raw);
        if (nextAllowed) {
          setNextResendAllowedAt(new Date(nextAllowed));
        } else {
          setNextResendAllowedAt(new Date(Date.now() + 60 * 1000));
        }
        
        toast.success("New OTP sent. The previous OTP is no longer valid. Use the latest OTP email.");
      } else if (res.status === 429) {
        // Too Many Requests - rate limit exceeded
        const retryAfter = res.headers?.['retry-after'] || (res.raw as any)?.retryAfterSeconds || 60;
        toast.error(`Too many requests. Try again in ${retryAfter} seconds.`);
        
        // Set cooldown based on retry-after
        setNextResendAllowedAt(new Date(Date.now() + retryAfter * 1000));
      } else if (res.status === 400 && (res.raw as any)?.errors?.['Device.InstallationIdentifier']) {
        // Device validation error
        toast.error("Device validation failed. Please refresh the page.");
      } else {
        // Check if max resends reached
        const errorMessage = (res.raw as any)?.message || (res.raw as any)?.title || '';
        if (errorMessage.toLowerCase().includes('maximum') || errorMessage.toLowerCase().includes('limit') || errorMessage.toLowerCase().includes('exceeded')) {
          setMaxResendsReached(true);
          setCanResendOtp(false);
          toast.error("Maximum OTP resend limit reached. Please wait 15 minutes before trying again.");
        } else {
          toast.error(`Failed to resend OTP: ${res.status}`);
        }
        // Display validation errors if present
        if (res.raw && typeof res.raw === 'object') {
          const errors = (res.raw as any).errors;
          if (errors) {
            Object.entries(errors).forEach(([field, messages]) => {
              const msg = Array.isArray(messages) ? messages.join(', ') : messages;
              toast.error(`${field}: ${msg}`);
            });
          }
        }
      }
    } catch (error) {
      toast.error("An error occurred");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    // Reset all state and go back to credentials step
    setStep("credentials");
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
    toast.success("Starting over. Please enter your credentials.");
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginChallengeId || !otp) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const deviceContext = buildDeviceContext();
      const res = await authApi.verifyFirstAccessOtp({ 
        LoginChallengeId: loginChallengeId, 
        OtpCode: otp,
        Device: deviceContext
      });
      setLastResponse(res.raw);
      
      if (res.ok && res.raw) {
        const restricted = extractRestrictedToken(res.raw);
        if (restricted) {
          setRestrictedToken(restricted);
        }
        setStep("password");
        toast.success("OTP verified. Set your permanent password.");
      } else {
        toast.error(`OTP verification failed: ${res.status}`);
        // Display validation errors if present
        if (res.raw && typeof res.raw === 'object') {
          const errors = (res.raw as any).errors;
          if (errors) {
            Object.entries(errors).forEach(([field, messages]) => {
              const msg = Array.isArray(messages) ? messages.join(', ') : messages;
              toast.error(`${field}: ${msg}`);
            });
          }
        }
      }
    } catch (error) {
      toast.error("An error occurred");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginChallengeId || !restrictedToken || !temporaryPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const deviceContext = buildDeviceContext();
      const res = await authApi.completeFirstAccess({
        LoginChallengeId: loginChallengeId,
        RestrictedAuthorizationToken: restrictedToken,
        CurrentTemporaryPassword: temporaryPassword,
        NewPassword: newPassword,
        ConfirmNewPassword: confirmPassword,
        Device: deviceContext
      });
      setLastResponse(res.raw);
      
      if (res.ok && res.raw) {
        const tokenInfo = extractAccessToken(res.raw);
        console.log("Token info extracted:", tokenInfo);
        
        if (tokenInfo.token) {
          setAccessToken(tokenInfo.token, tokenInfo.expiresAt);
          setUser(tokenInfo.user);
          
          // Determine role and redirect
          const role = getUserRole(res.raw);
          console.log("Role extracted:", role);
          toast.success("First access completed successfully!");
          
          setTimeout(() => {
            if (role === "ADMIN") {
              router.replace("/dashboard/admin");
            } else if (role === "TEACHER") {
              router.replace("/dashboard/teacher");
            } else if (role === "STUDENT") {
              router.replace("/dashboard/student");
            } else {
              router.replace("/dashboard");
            }
          }, 500);
        } else {
          console.error("No access token in response", res.raw);
          toast.error("No access token in response");
        }
      } else {
        toast.error(`First access completion failed: ${res.status}`);
      }
    } catch (error) {
      toast.error("An error occurred");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-500/10 mb-4">
              <ShieldCheck className="h-8 w-8 text-accent-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Complete First Access</h1>
            <p className="text-slate-400 text-sm">Set your permanent password to activate your account</p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <StepIndicator number={1} active={step === "credentials"} completed={step !== "credentials"} />
            <div className="w-8 h-0.5 bg-slate-700" />
            <StepIndicator number={2} active={step === "otp"} completed={step === "password"} />
            <div className="w-8 h-0.5 bg-slate-700" />
            <StepIndicator number={3} active={step === "password"} completed={false} />
          </div>

          {/* Step 1: Credentials */}
          {step === "credentials" && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="label">Email or Username</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your email or username"
                    className="pl-10 w-full"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Temporary Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                    placeholder="Enter temporary password from email"
                    className="pl-10 pr-10 w-full"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn w-full" disabled={loading}>
                {loading ? "Sending OTP..." : (
                  <>
                    Continue to OTP
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === "otp" && (
            <form onSubmit={handleStep2} className="space-y-4">
              {challengeExpired && (
                <div className="card p-4 bg-danger-500/10 border-danger-500/20">
                  <p className="text-danger-400 text-sm">
                    Verification session expired. Please start again.
                  </p>
                </div>
              )}
              
              {maxResendsReached && (
                <div className="card p-4 bg-warning-500/10 border-warning-500/20">
                  <p className="text-warning-400 text-sm">
                    Maximum OTP resend limit reached. Please wait 15 minutes before trying again.
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
                    onClick={() => copyToClipboard(loginChallengeId, "Challenge ID")}
                    className="btn-ghost p-2"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
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
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="pl-10 w-full"
                    maxLength={6}
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
                      onClick={() => setStep("credentials")}
                      className="btn-secondary flex-1"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                    <button 
                      type="button" 
                      onClick={handleResendOtp}
                      className="btn-secondary flex-1" 
                      disabled={loading || !canResendOtp}
                    >
                      {loading ? "Sending..." : canResendOtp ? "Resend OTP" : `Resend (${resendCooldown}s)`}
                    </button>
                    <button type="submit" className="btn flex-1" disabled={loading}>
                      {loading ? "Verifying..." : "Verify OTP"}
                    </button>
                  </>
                )}
              </div>
            </form>
          )}

          {/* Step 3: Password */}
          {step === "password" && (
            <form onSubmit={handleStep3} className="space-y-4">
              <div className="card p-4 bg-success-500/10 border-success-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-success-500" />
                  <span className="text-success-400 font-medium">OTP Verified</span>
                </div>
                <p className="text-sm text-slate-400">
                  Set your permanent password to complete first access.
                </p>
              </div>
              
              <div className="card p-4 bg-slate-800/50">
                <label className="label">Restricted Authorization Token</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={restrictedToken}
                    readOnly
                    className="flex-1 bg-slate-900/50 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(restrictedToken, "Token")}
                    className="btn-ghost p-2"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="pl-10 pr-10 w-full"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="pl-10 pr-10 w-full"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                <button type="submit" className="btn flex-1" disabled={loading}>
                  {loading ? "Completing..." : (
                    <>
                      Complete First Access
                      <CheckCircle2 className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Links */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <Link href="/login" className="block text-sm text-center text-slate-400 hover:text-primary-400 transition-colors">
              Already have a permanent password? Login instead
            </Link>
          </div>

          {/* Response Viewer - Development Only */}
          {process.env.NODE_ENV === "development" && lastResponse != null && (
            <div className="mt-6">
              <ResponseViewer data={lastResponse as Record<string, unknown>} title="API Response" />
            </div>
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
      ${active ? 'bg-accent-500 text-white' : completed ? 'bg-success-500 text-white' : 'bg-slate-800 text-slate-500'}
    `}>
      {completed ? <CheckCircle2 className="h-4 w-4" /> : number}
    </div>
  );
}
