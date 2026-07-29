"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, AlertTriangle, ExternalLink, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/src/lib/api/auth";
import { useAuthStore } from "@/src/store/auth-store";
import { AuthGuard } from "@/src/components/auth-guard";
import type { RoleName } from "@/src/types/api";

function AccountSecurityContent() {
  const router = useRouter();
  const { clearAuth, getPrimaryRole } = useAuthStore();
  const [loading, setLoading] = useState(false);
  
  // Change password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const userRole = getPrimaryRole();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!currentPassword) {
      toast.error("Current password is required");
      return;
    }
    
    if (!newPassword) {
      toast.error("New password is required");
      return;
    }
    
    if (!confirmPassword) {
      toast.error("Please confirm your new password");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    // Backend password validation rules
    const passwordRules = {
      minLength: 12,
      maxLength: 64,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasLowercase: /[a-z]/.test(newPassword),
      hasDigit: /[0-9]/.test(newPassword),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)
    };
    
    if (newPassword.length < passwordRules.minLength) {
      toast.error(`Password must be at least ${passwordRules.minLength} characters`);
      return;
    }
    
    if (newPassword.length > passwordRules.maxLength) {
      toast.error(`Password must not exceed ${passwordRules.maxLength} characters`);
      return;
    }
    
    if (!passwordRules.hasUppercase) {
      toast.error("Password must contain at least one uppercase letter");
      return;
    }
    
    if (!passwordRules.hasLowercase) {
      toast.error("Password must contain at least one lowercase letter");
      return;
    }
    
    if (!passwordRules.hasDigit) {
      toast.error("Password must contain at least one digit");
      return;
    }
    
    if (!passwordRules.hasSpecial) {
      toast.error("Password must contain at least one special character");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.changePassword({
        CurrentPassword: currentPassword,
        NewPassword: newPassword,
        ConfirmNewPassword: confirmPassword
      });
      
      if (res.ok) {
        toast.success("Password changed successfully. Please sign in again.");
        clearAuth();
        router.push("/login");
      } else {
        // Show backend error details if available
        const errorMessage = res.data?.detail || res.data?.title || "Failed to change password";
        toast.error(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.title || "An error occurred while changing password";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Account Security</h1>
        <p className="text-slate-400 text-sm">Manage your password and password recovery options.</p>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Change Password Card */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-primary-400" />
            <h2 className="text-lg font-semibold">Change Password</h2>
          </div>
          <p className="text-sm text-slate-400 mb-6">
            Update your account password. After a successful password change, all active sessions may be revoked and you may need to sign in again.
          </p>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showCurrentPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 12 characters)"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showNewPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Must be 12-64 characters with uppercase, lowercase, digit, and special character.
              </p>
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Changing..." : "Change Password"}
            </button>
          </form>
        </div>

        {/* Forgot Password Card */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-warning-400" />
            <h2 className="text-lg font-semibold">Forgot Password?</h2>
          </div>
          <p className="text-sm text-slate-400 mb-6">
            If you cannot remember your current password, you can reset it securely using your registered email address and OTP verification.
          </p>
          <Link href="/auth/forgot-password" className="btn btn-secondary w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            Reset Password via Email
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AccountSecurityPage() {
  return (
    <AuthGuard allowedRoles={["ADMIN", "TEACHER", "STUDENT"]}>
      <AccountSecurityContent />
    </AuthGuard>
  );
}
