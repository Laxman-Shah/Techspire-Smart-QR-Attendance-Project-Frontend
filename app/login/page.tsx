"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Lock, Mail, KeyRound, CheckCircle2, Copy, Eye, EyeOff, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/src/lib/api/auth";
import { extractAccessToken } from "@/src/lib/api/client";
import { extractChallengeId, extractRestrictedToken, extractOtpExpiresAt, extractNextResendAllowedAt, extractRemainingResends, extractChallengeExpiresAt } from "@/src/lib/api/extractors";
import { useAuthStore } from "@/src/store/auth-store";
import { ResponseViewer } from "@/src/components/response-viewer";
import { FullPageLoading } from "@/src/components/full-page-loading";
import { getUserRole } from "@/src/lib/auth/role";
import { buildDeviceContext } from "@/src/lib/device/device-context";

type LoginStep = "credentials" | "otp" | "complete" | "password";
type FlowType = "NORMAL_LOGIN" | "FIRST_ACCESS";

export default function LoginPage() {
  const router = useRouter();
  const { setAccessToken, setUser, clearAuth, isInitializing, hasInitialized, isAuthenticated, user } = useAuthStore();

  // All local state hooks - must be declared before any conditional return
  const [step, setStep] = useState<LoginStep>("credentials");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loginCooldownSeconds, setLoginCooldownSeconds] = useState(0);
  const [lockedUntilUtc, setLockedUntilUtc] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  
  // Form state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loginChallengeId, setLoginChallengeId] = useState("");
  const [otp, setOtp] = useState("");
  const [restrictedToken, setRestrictedToken] = useState("");
  const [currentTempPassword, setCurrentTempPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCurrentTempPassword, setShowCurrentTempPassword] = useState(false);
  
  // Flow state
  const [flowType, setFlowType] = useState<FlowType>("NORMAL_LOGIN");
  
  // Response state
  const [lastResponse, setLastResponse] = useState<unknown>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Complete login submission guard
  const completeLoginSubmittingRef = useRef(false);
  
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

  // Mount/unmount tracking for debugging
  useEffect(() => {
    console.log("[LOGIN PAGE] Component mounted");
    return () => console.log("[LOGIN PAGE] Component unmounted");
  }, []);

  // Redirect if already authenticated (only on credentials step, not during complete login)
  useEffect(() => {
    // On login page, don't wait for initialization - just check if we have a valid token
    // This prevents "Checking your session" from blocking the login form
    if (!hasInitialized) {
      return;
    }

    // Only redirect if we're on the credentials step and not loading
    // During complete step, handleStep3/handleStep4 control the redirect
    if (step === "credentials" && !loading && !errorTitle && !errorMessage) {
      if (isAuthenticated()) {
        console.log("[LOGIN PAGE] User is authenticated, redirecting to dashboard");
        const role = getPrimaryRole(user);
        const targetPath =
          role === "ADMIN"
            ? "/dashboard/admin"
            : role === "TEACHER"
              ? "/dashboard/teacher"
              : role === "STUDENT"
                ? "/dashboard/student"
                : "/dashboard";
        router.replace(targetPath);
      }
    }
  }, [hasInitialized, isAuthenticated, user, router, step, loading, errorTitle, errorMessage]);

  // Cooldown timer effect
  useEffect(() => {
    if (loginCooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setLoginCooldownSeconds((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [loginCooldownSeconds]);

  // Current time updater for lockout countdown
  useEffect(() => {
    if (!lockedUntilUtc && loginCooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [lockedUntilUtc, loginCooldownSeconds]);

  // Calculate lockout remaining seconds based on current time
  const lockoutRemainingSeconds = lockedUntilUtc
    ? Math.max(0, Math.ceil((new Date(lockedUntilUtc).getTime() - now) / 1000))
    : 0;

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

  // On login page, never show "Checking your session" - it blocks the login form
  // Just render the login form immediately

  const handleStartOver = () => {
    // Reset all state and go back to credentials step
    setStep("credentials");
    setFlowType("NORMAL_LOGIN");
    setLoginChallengeId("");
    setOtp("");
    setRestrictedToken("");
    setCurrentTempPassword("");
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

  // Normalize user from auth response
  function normalizeAuthUser(raw: any) {
    const user =
      raw?.user ??
      raw?.User ??
      raw?.data?.user ??
      raw?.data?.User ??
      raw?.result?.user ??
      raw?.result?.User ??
      null;

    if (!user || typeof user !== "object") return null;

    const roles =
      user.roles ??
      user.Roles ??
      user.role ??
      user.Role ??
      [];

    return {
      ...user,
      userId: user.userId ?? user.UserId,
      username: user.username ?? user.Username,
      email: user.email ?? user.Email,
      fullName: user.fullName ?? user.FullName,
      accountStatus: user.accountStatus ?? user.AccountStatus,
      emailVerified: user.emailVerified ?? user.EmailVerified,
      roles: Array.isArray(roles) ? roles : [roles]
    };
  }

  // Get primary role from user
  function getPrimaryRole(user: any): string | null {
    const roles =
      user?.roles ??
      user?.Roles ??
      [];

    const normalizedRoles = Array.isArray(roles)
      ? roles.map((role) => String(role).toUpperCase())
      : [String(roles).toUpperCase()];

    if (normalizedRoles.includes("ADMIN")) return "ADMIN";
    if (normalizedRoles.includes("TEACHER")) return "TEACHER";
    if (normalizedRoles.includes("STUDENT")) return "STUDENT";

    return null;
  }

  // Error extraction helper
  function extractLoginError(response: any) {
    const raw = response.raw ?? response.error ?? {};

    const code =
      raw.errorCode ??
      raw.ErrorCode ??
      raw.code ??
      raw.Code ??
      null;

    const detail =
      raw.detail ??
      raw.Detail ??
      raw.message ??
      raw.Message ??
      raw.title ??
      raw.Title ??
      null;

    const lockedUntil =
      raw.lockedUntilUtc ??
      raw.LockedUntilUtc ??
      raw.lockedUntil ??
      raw.LockedUntil ??
      raw.extensions?.lockedUntilUtc ??
      null;

    if (response.status === 423 || code === "ACCOUNT_LOCKED") {
      return {
        title: "Account temporarily locked",
        message: detail ?? "Your account is temporarily locked. Please try again later.",
        code: "ACCOUNT_LOCKED",
        lockedUntilUtc: lockedUntil
      };
    }

    if (response.status === 429 || code === "RATE_LIMITED") {
      return {
        title: "Too many login attempts",
        message: detail ?? "Please wait before trying again.",
        code: "RATE_LIMITED",
        lockedUntilUtc: null
      };
    }

    if (response.status === 401) {
      return {
        title: "Login failed",
        message: detail ?? "Unable to complete sign-in. Please check your credentials or account status.",
        code: code ?? "AUTHENTICATION_FAILED",
        lockedUntilUtc: null
      };
    }

    return {
      title: "Login failed",
      message: detail ?? "Unable to complete sign-in. Please try again.",
      code,
      lockedUntilUtc: null
    };
  }

  // Format seconds as MM:SS
  function formatTime(seconds: number): string {
    const safe = Math.max(0, seconds);
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Format local time for unlock display
  function formatLocalTime(utcString: string): string {
    const date = new Date(utcString);
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }

  // Format local date and time if different day
  function formatLocalDateTime(utcString: string): string {
    const date = new Date(utcString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return `today at ${formatLocalTime(utcString)}`;
    }
    
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (loading) {
      return;
    }
    
    // Prevent submission during cooldown or lockout
    if (loginCooldownSeconds > 0 || lockoutRemainingSeconds > 0) {
      return;
    }
    
    // Clear any previous error
    console.log('[LOGIN ERROR CLEARED]', { reason: 'user submitted login' });
    setErrorTitle(null);
    setErrorMessage(null);
    setErrorCode(null);
    setFieldErrors({});
    setLockedUntilUtc(null);
    
    if (!identifier || !password) {
      setErrorMessage("Please fill in all fields");
      console.error("Validation error: Missing identifier or password");
      return;
    }

    // Clear old challenge state to prevent reuse
    setLoginChallengeId("");
    setOtp("");
    setRestrictedToken("");
    setCurrentTempPassword("");
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
      console.log("Attempting login for:", identifier);
      const deviceContext = buildDeviceContext();
      const res = await authApi.login({
        Identifier: identifier,
        Password: password,
        LoginContext: "Web",
        Device: deviceContext,
      });
      setLastResponse(res.raw);
      console.log("Login response:", res);

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
          
          // Detect flow type from response
          const challengeType = (res.raw as any).ChallengeType || (res.raw as any).challengeType;
          const nextStep = (res.raw as any).NextStep || (res.raw as any).nextStep;
          const requiresPasswordChange = (res.raw as any).RequiresPasswordChange || (res.raw as any).requiresPasswordChange;
          
          if (challengeType === 'FirstAccess' || requiresPasswordChange || nextStep === 'SET_PASSWORD') {
            setFlowType('FIRST_ACCESS');
            toast.success("Temporary password detected. Please verify OTP and create your permanent password.");
          } else {
            setFlowType('NORMAL_LOGIN');
            toast.success("OTP sent. Continue with verification.");
          }
          
          setStep("otp");
        } else {
          const errorMsg = "Login request succeeded but challenge ID could not be found. Check response shape in raw response panel.";
          setErrorMessage(errorMsg);
          console.error(errorMsg, res.raw);
        }
      } else {
        // Handle 429 rate limiting
        if (res.status === 429) {
          const retryAfter = res.headers?.['retry-after'];
          const cooldownSeconds = retryAfter ? parseInt(retryAfter, 10) : 60;
          setLoginCooldownSeconds(cooldownSeconds);
        }
        
        // Extract error details
        const error = extractLoginError(res);
        console.log('[LOGIN ERROR SET]', {
          title: error.title,
          message: error.message,
          code: error.code,
          lockedUntilUtc: error.lockedUntilUtc
        });
        setErrorTitle(error.title);
        setErrorMessage(error.message);
        setErrorCode(error.code);
        
        // Handle 423 account lockout
        if (error.lockedUntilUtc) {
          console.log('[LOGIN] Setting lockout until:', error.lockedUntilUtc);
          setLockedUntilUtc(error.lockedUntilUtc);
        }
        
        console.error("Login failed:", { status: res.status, raw: res.raw, error });
        
        // Display validation errors if present
        if (res.raw && typeof res.raw === 'object') {
          const errors = (res.raw as any).errors;
          if (errors) {
            setFieldErrors(errors);
            console.error("Validation errors:", errors);
          }
        }
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || error?.response?.data?.title || error?.message || "An unexpected error occurred. Please try again.";
      console.log('[LOGIN ERROR SET]', { title: 'Catch error', message: errorMsg, code: null, lockedUntilUtc: null });
      setErrorMessage(errorMsg);
      console.error("Login error:", error);
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
        console.log("Resend response:", res.raw);
        console.log("Extracted OTP expiry:", newOtpExpires);
        if (newOtpExpires) {
          const newExpiryDate = new Date(newOtpExpires);
          console.log("Setting otpExpiresAt to:", newExpiryDate);
          setOtpExpiresAt(newExpiryDate);
          setOtpExpired(false);
        } else {
          // Fallback to 10 minutes if backend doesn't provide OTP expiry
          const defaultExpiry = new Date(Date.now() + 10 * 60 * 1000);
          console.log("Backend did not provide OTP expiry, using fallback:", defaultExpiry);
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

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginChallengeId || !otp) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const deviceContext = buildDeviceContext();
      let res;
      
      // Select endpoint based on flow type
      if (flowType === 'FIRST_ACCESS') {
        res = await authApi.verifyFirstAccessOtp({ 
          LoginChallengeId: loginChallengeId, 
          OtpCode: otp,
          Device: deviceContext
        });
      } else {
        res = await authApi.verifyLoginOtp({ 
          LoginChallengeId: loginChallengeId, 
          OtpCode: otp,
          Device: deviceContext
        });
      }
      setLastResponse(res.raw);
      
      if (res.ok && res.raw) {
        const restricted = extractRestrictedToken(res.raw);
        if (restricted) {
          setRestrictedToken(restricted);
        }
        
        if (flowType === 'FIRST_ACCESS') {
          setStep("password");
          toast.success("OTP verified. Please create your permanent password.");
        } else {
          setStep("complete");
          toast.success("OTP verified. Complete login now.");
        }
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
    e.stopPropagation();

    if (loading) return;
    if (completeLoginSubmittingRef.current) return;
    if (!loginChallengeId) {
      toast.error("Missing login challenge. Please start again.");
      return;
    }

    // Check if challenge is expired
    if (challengeExpired) {
      toast.error("Your verification session expired. Please sign in again.");
      setStep("credentials");
      return;
    }

    completeLoginSubmittingRef.current = true;
    setLoading(true);

    try {
      console.log("[LOGIN COMPLETE] Using challengeId:", loginChallengeId);
      const res = await authApi.completeLogin({ 
        ChallengeId: loginChallengeId, 
        RestrictedAuthorizationToken: restrictedToken || undefined 
      });
      setLastResponse(res.raw);

      if (!res.ok || !res.raw) {
        const error = extractLoginError(res);
        setErrorTitle(error.title);
        setErrorMessage(error.message);
        setErrorCode(error.code);
        
        // Handle invalid/expired challenge specifically
        if (error.code === "INVALID_OR_EXPIRED_CHALLENGE" || error.message.includes("expired") || error.message.includes("Invalid or expired")) {
          toast.error("Your verification session expired. Please sign in again.");
          setStep("credentials");
          // Clear challenge state
          setLoginChallengeId("");
          setChallengeExpiresAt(null);
          setChallengeExpired(false);
        }
        
        // Handle browser installation already registered to another user
        if (error.code === "BROWSER_INSTALLATION_ALREADY_REGISTERED" || error.message.includes("browser installation is already registered")) {
          toast.error("This browser is already registered to another account.");
          // Keep user on complete step with clear error message
          // Do not reset to credentials - user needs to understand the issue
        }
        
        return;
      }

      const tokenInfo = extractAccessToken(res.raw);

      if (!tokenInfo.token) {
        setErrorTitle("Login completed but token is missing");
        setErrorMessage("The server did not return an access token. Please try again.");
        setErrorCode("ACCESS_TOKEN_MISSING");
        return;
      }

      // Normalize user from response
      const normalizedUser = normalizeAuthUser(res.raw);

      if (!normalizedUser) {
        setErrorTitle("Login completed but user is missing");
        setErrorMessage("The server did not return user information. Please try again.");
        setErrorCode("USER_MISSING");
        return;
      }

      // Save to auth store
      setAccessToken(tokenInfo.token, tokenInfo.expiresAt);
      setUser(normalizedUser);

      // Debug logging
      console.log("[LOGIN COMPLETE] token exists:", Boolean(tokenInfo.token));
      console.log("[LOGIN COMPLETE] user exists:", Boolean(normalizedUser));
      console.log("[LOGIN COMPLETE] user roles:", normalizedUser.roles);

      // Get primary role from normalized user
      const role = getPrimaryRole(normalizedUser);
      console.log("[LOGIN COMPLETE] primary role:", role);

      const targetPath =
        role === "ADMIN"
          ? "/dashboard/admin"
          : role === "TEACHER"
            ? "/dashboard/teacher"
            : role === "STUDENT"
              ? "/dashboard/student"
              : "/dashboard";

      toast.success("Login successful.", { duration: 3000 });

      // Immediate redirect using router.replace
      router.replace(targetPath);
    } catch (error) {
      setErrorTitle("Login failed");
      setErrorMessage("An unexpected error occurred while completing login.");
      setErrorCode("LOGIN_COMPLETE_FAILED");
      console.warn("[LOGIN COMPLETE FAILED]", error);
    } finally {
      completeLoginSubmittingRef.current = false;
      setLoading(false);
    }
  };

  const handleStep4 = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;
    if (!loginChallengeId || !restrictedToken || !currentTempPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Password validation: 12-128 chars, uppercase, lowercase, number, special char
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

    const deviceContext = buildDeviceContext();
    if (!deviceContext.InstallationIdentifier || deviceContext.InstallationIdentifier.length < 32) {
      toast.error("Device installation ID is invalid");
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.completeFirstAccess({
        LoginChallengeId: loginChallengeId,
        RestrictedAuthorizationToken: restrictedToken,
        CurrentTemporaryPassword: currentTempPassword,
        NewPassword: newPassword,
        ConfirmNewPassword: confirmPassword,
        Device: deviceContext
      });
      setLastResponse(res.raw);

      if (!res.ok || !res.raw) {
        const error = extractLoginError(res);
        setErrorTitle(error.title);
        setErrorMessage(error.message);
        setErrorCode(error.code);
        return;
      }

      const tokenInfo = extractAccessToken(res.raw);

      if (!tokenInfo.token) {
        setErrorTitle("First access completed but token is missing");
        setErrorMessage("The server did not return an access token. Please try again.");
        setErrorCode("ACCESS_TOKEN_MISSING");
        return;
      }

      // Normalize user from response
      const normalizedUser = normalizeAuthUser(res.raw);

      if (!normalizedUser) {
        setErrorTitle("First access completed but user is missing");
        setErrorMessage("The server did not return user information. Please try again.");
        setErrorCode("USER_MISSING");
        return;
      }

      // Save to auth store
      setAccessToken(tokenInfo.token, tokenInfo.expiresAt);
      setUser(normalizedUser);

      // Clear first-access state to prevent reuse
      setFlowType("NORMAL_LOGIN");
      setCurrentTempPassword("");
      setRestrictedToken("");

      // Debug logging
      console.log("[FIRST ACCESS COMPLETE] token exists:", Boolean(tokenInfo.token));
      console.log("[FIRST ACCESS COMPLETE] user exists:", Boolean(normalizedUser));
      console.log("[FIRST ACCESS COMPLETE] user roles:", normalizedUser.roles);

      // Get primary role from normalized user
      const role = getPrimaryRole(normalizedUser);
      console.log("[FIRST ACCESS COMPLETE] primary role:", role);

      const targetPath =
        role === "ADMIN"
          ? "/dashboard/admin"
          : role === "TEACHER"
            ? "/dashboard/teacher"
            : role === "STUDENT"
              ? "/dashboard/student"
              : "/dashboard";

      toast.success("First access completed successfully!", { duration: 3000 });

      // Immediate redirect using router.replace
      router.replace(targetPath);
    } catch (error) {
      setErrorTitle("First access failed");
      setErrorMessage("An unexpected error occurred while completing first access.");
      setErrorCode("FIRST_ACCESS_COMPLETE_FAILED");
      console.warn("[FIRST ACCESS COMPLETE FAILED]", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  // Sanitize auth response for debug display
  function sanitizeAuthResponseForDebug(data: any): any {
    if (!data || typeof data !== "object") return data;

    const sanitized = { ...data };

    // Hide access tokens
    if (sanitized.tokens?.accessToken) {
      sanitized.tokens.accessToken = "***";
    }
    if (sanitized.tokens?.AccessToken) {
      sanitized.tokens.AccessToken = "***";
    }
    if (sanitized.accessToken) {
      sanitized.accessToken = "***";
    }
    if (sanitized.AccessToken) {
      sanitized.AccessToken = "***";
    }

    // Hide refresh tokens
    if (sanitized.tokens?.refreshToken) {
      sanitized.tokens.refreshToken = "***";
    }
    if (sanitized.tokens?.RefreshToken) {
      sanitized.tokens.RefreshToken = "***";
    }

    return sanitized;
  }

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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 mb-4">
              <Lock className="h-8 w-8 text-primary-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Login to Smart QR Attendance</h1>
            <p className="text-slate-400 text-sm">Secure authentication with OTP verification</p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <StepIndicator number={1} active={step === "credentials"} completed={step !== "credentials"} />
            <div className="w-8 h-0.5 bg-slate-700" />
            <StepIndicator number={2} active={step === "otp"} completed={step === "complete" || step === "password"} />
            <div className="w-8 h-0.5 bg-slate-700" />
            <StepIndicator number={3} active={step === "complete" || step === "password"} completed={false} />
          </div>

          {/* Flow Type Message */}
          {flowType === 'FIRST_ACCESS' && (
            <div className="mb-6 p-4 bg-accent-500/10 border border-accent-500/20 rounded-lg">
              <p className="text-sm text-accent-400">
                Temporary password detected. Please verify OTP and create your permanent password to activate your account.
              </p>
            </div>
          )}

          {/* Development-only testing guidance */}
          {process.env.NODE_ENV === "development" && step === "credentials" && (
            <div className="mb-6 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
              <p className="text-xs text-slate-400">
                <strong>Development note:</strong> If testing multiple users on the same computer, use a separate browser profile, incognito window, or another browser. This system binds one browser installation to one account.
              </p>
            </div>
          )}

          {/* Step 1: Credentials */}
          {step === "credentials" && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label htmlFor="identifier" className="label">Email or Username</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      console.log('[LOGIN ERROR CLEARED]', { reason: 'user changed email' });
                      setIdentifier(e.target.value);
                      setErrorTitle(null);
                      setErrorMessage(null);
                      setErrorCode(null);
                      setFieldErrors({});
                    }}
                    placeholder="Enter your email or username"
                    className="pl-10 w-full"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      console.log('[LOGIN ERROR CLEARED]', { reason: 'user changed password' });
                      setPassword(e.target.value);
                      setErrorTitle(null);
                      setErrorMessage(null);
                      setErrorCode(null);
                      setFieldErrors({});
                    }}
                    placeholder="Enter your password"
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
              
              {/* Persistent Error Display */}
              {errorMessage && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{errorTitle || "Login failed"}</p>
                      <p>{errorMessage}</p>
                      {loginCooldownSeconds > 0 && (
                        <p className="mt-1 text-red-300">Please try again in {loginCooldownSeconds} seconds.</p>
                      )}
                      {lockoutRemainingSeconds > 0 && lockedUntilUtc && (
                        <>
                          <p className="mt-1 text-red-300">Try again in {formatTime(lockoutRemainingSeconds)}.</p>
                          <p className="mt-1 text-red-300">Unlocks {formatLocalDateTime(lockedUntilUtc)}.</p>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('[LOGIN ERROR CLEARED]', { reason: 'user manually dismissed' });
                        setErrorTitle(null);
                        setErrorMessage(null);
                        setErrorCode(null);
                      }}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      aria-label="Dismiss error"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
              
              {/* Field Errors */}
              {Object.keys(fieldErrors).length > 0 && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Validation errors</p>
                      {Object.entries(fieldErrors).map(([field, messages]) => (
                        <p key={field}>{field}: {Array.isArray(messages) ? messages.join(', ') : messages}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <button 
                type="submit" 
                className="btn w-full" 
                disabled={loading || loginCooldownSeconds > 0 || lockoutRemainingSeconds > 0 || !identifier.trim() || !password}
              >
                {loading ? "Checking..." : lockoutRemainingSeconds > 0 ? `Account locked ${formatTime(lockoutRemainingSeconds)}` : loginCooldownSeconds > 0 ? `Try again in ${loginCooldownSeconds}s` : (
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
                      onClick={() => {
                        setStep("credentials");
                        setFlowType("NORMAL_LOGIN");
                      }}
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

          {/* Step 3: Complete (Normal Login) */}
          {step === "complete" && flowType === "NORMAL_LOGIN" && (
            <form onSubmit={handleStep3} className="space-y-4">
              {/* Browser installation error */}
              {errorCode === "BROWSER_INSTALLATION_ALREADY_REGISTERED" && (
                <div className="card p-4 bg-error-500/10 border-error-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-error-500" />
                    <span className="text-error-400 font-medium">Device cannot be used</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">
                    This browser is already registered to another account. Please use a different browser profile, incognito window, or contact your administrator.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("credentials");
                        setErrorCode(null);
                        setErrorTitle(null);
                        setErrorMessage(null);
                      }}
                      className="btn-secondary text-sm flex-1"
                    >
                      Start again
                    </button>
                    {process.env.NODE_ENV === "development" && (
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem("smart_qr_installation_id");
                          clearAuth();
                          router.replace("/login");
                        }}
                        className="btn-ghost text-sm flex-1 text-slate-400"
                      >
                        Reset browser installation
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="card p-4 bg-success-500/10 border-success-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-success-500" />
                  <span className="text-success-400 font-medium">OTP Verified</span>
                </div>
                <p className="text-sm text-slate-400">
                  Your identity has been verified. Complete the login to create your session.
                </p>
              </div>
              
              {restrictedToken && (
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
              )}

              <button type="submit" className="btn w-full" disabled={loading || completeLoginSubmittingRef.current || challengeExpired}>
                {loading ? "Completing..." : (
                  <>
                    Complete Login
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 3: Password Change (First Access) */}
          {step === "password" && flowType === "FIRST_ACCESS" && (
            <form onSubmit={handleStep4} className="space-y-4">
              <div className="card p-4 bg-success-500/10 border-success-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-success-500" />
                  <span className="text-success-400 font-medium">OTP Verified</span>
                </div>
                <p className="text-sm text-slate-400">
                  Create your permanent password to activate your account.
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
                <label className="label">Current Temporary Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showCurrentTempPassword ? "text" : "password"}
                    value={currentTempPassword}
                    onChange={(e) => setCurrentTempPassword(e.target.value)}
                    placeholder="Enter your temporary password from email"
                    className="pl-10 pr-10 w-full"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentTempPassword(!showCurrentTempPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showCurrentTempPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                    placeholder="12+ chars, uppercase, lowercase, number, special char"
                    className="pl-10 pr-10 w-full"
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
              </div>

              <div>
                <label className="label">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="pl-10 pr-10 w-full"
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
          {step === "credentials" && (
            <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
              <Link href="/auth/forgot-password" className="block text-sm text-center text-slate-400 hover:text-primary-400 transition-colors">
                Forgot password?
              </Link>
              <Link href="/auth/first-access" className="block text-sm text-center text-slate-400 hover:text-accent-400 transition-colors">
                First time here? Complete first access
              </Link>
            </div>
          )}

          {/* Response Viewer - Development Only */}
          {process.env.NODE_ENV === "development" && lastResponse != null && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowDebugPanel((value) => !value)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                {showDebugPanel ? "Hide debug response" : "Show debug response"}
              </button>
              {showDebugPanel && (
                <ResponseViewer
                  data={sanitizeAuthResponseForDebug(lastResponse as Record<string, unknown>)}
                  title="API Response"
                />
              )}
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
      ${active ? 'bg-primary-500 text-white' : completed ? 'bg-success-500 text-white' : 'bg-slate-800 text-slate-500'}
    `}>
      {completed ? <CheckCircle2 className="h-4 w-4" /> : number}
    </div>
  );
}
