import { request } from "@/src/lib/api/client";
import type * as T from "@/src/types/api";

export const authApi = {
  firstAccess: (body: T.LoginRequest) => request("POST", "/api/auth/first-access", body),
  verifyFirstAccessOtp: (body: T.VerifyLoginOtpRequest) => request("POST", "/api/auth/first-access/verify-otp", body),
  completeFirstAccess: (body: T.CompleteFirstAccessRequest) => request("POST", "/api/auth/first-access/complete", body),
  login: (body: T.LoginRequest) => request("POST", "/api/auth/login", body),
  verifyLoginOtp: (body: T.VerifyLoginOtpRequest) => request("POST", "/api/auth/login/verify-otp", body),
  completeLogin: (body: T.CompleteLoginRequest) => request("POST", "/api/auth/login/complete", body),
  resendOtp: (body: T.ResendLoginOtpRequest) => request("POST", "/api/auth/login/resend-otp", body),
  refreshToken: () => request("POST", "/api/auth/refresh-token"),
  refreshTokenLogout: () => request("POST", "/api/auth/refresh-token/logout"),
  forgotPassword: (body: T.ForgotPasswordRequest) => request("POST", "/api/auth/forgot-password", body),
  verifyPasswordResetOtp: (body: T.VerifyPasswordResetOtpRequest) => request("POST", "/api/auth/password-reset/verify-otp", body),
  resendPasswordResetOtp: (body: T.ResendLoginOtpRequest) => request("POST", "/api/auth/password-reset/resend-otp", body),
  resetPassword: (body: T.ResetPasswordRequest) => request("POST", "/api/auth/reset-password", body),
  changePassword: (body: { CurrentPassword: string; NewPassword: string; ConfirmNewPassword: string }) => 
    request("POST", "/api/auth/change-password", body),
  logout: () => request("POST", "/api/auth/logout"),
  sessions: () => request("GET", "/api/auth/sessions"),
  revokeOtherSessions: () => request("POST", "/api/auth/sessions/others/revoke"),
  revokeAllSessions: () => request("POST", "/api/auth/sessions/all/revoke"),
  revokeSession: (sessionId: string, body: Record<string, unknown> = {}) => request("POST", `/api/auth/sessions/${sessionId}/revoke`, body),
  deleteSession: (sessionId: string, body: Record<string, unknown> = {}) => request("DELETE", `/api/auth/sessions/${sessionId}`, body),
  loginActivities: () => request("GET", "/api/auth/login-activities"),
  pageLoad: () => request("GET", "/api/auth/page-load"),
  requestDeviceReplacement: (body: T.RequestDeviceReplacementRequest) => request("POST", "/api/auth/device-replacement/request", body),
  approveDeviceReplacement: (body: T.ApproveDeviceReplacementRequest) => request("POST", "/api/auth/device-replacement/approve", body),
  adminCreateDeviceReplacement: (body: T.AdminCreateDeviceReplacementRequest) => request("POST", "/api/auth/device-replacement/admin-create", body),
  startDeviceReplacement: (body: T.StartDeviceReplacementCompletionRequest) => request("POST", "/api/auth/device-replacement/start", body),
  verifyDeviceReplacementOtp: (body: T.VerifyDeviceReplacementOtpRequest) => request("POST", "/api/auth/device-replacement/verify-otp", body),
  resendDeviceReplacementOtp: (body: T.ResendLoginOtpRequest) => request("POST", "/api/auth/device-replacement/resend-otp", body),
  registerUser: (body: T.RegisterUserRequest) => request("POST", "/api/auth/register-user", body)
};
