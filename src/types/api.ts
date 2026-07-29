export type RoleName = "STUDENT" | "TEACHER" | "ADMIN";

export interface ApiResult<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: unknown;
  raw: unknown;
  headers?: Record<string, string>;
}

export interface DeviceContextRequest {
  InstallationIdentifier: string;
  BrowserFingerprint?: string;
  DeviceName?: string;
  DeviceType?: string;
  OperatingSystem?: string;
  OperatingSystemVersion?: string;
  BrowserName?: string;
  BrowserVersion?: string;
}

export interface LoginRequest {
  Identifier: string;
  Password: string;
  LoginContext?: string;
  Device?: DeviceContextRequest;
}
export interface VerifyLoginOtpRequest { LoginChallengeId: string; OtpCode: string; Device: DeviceContextRequest; }
export interface CompleteLoginRequest { ChallengeId: string; RestrictedAuthorizationToken?: string; }
export interface ResendLoginOtpRequest { LoginChallengeId: string; Device?: DeviceContextRequest; }
export interface CompleteFirstAccessRequest {
  LoginChallengeId: string;
  RestrictedAuthorizationToken: string;
  CurrentTemporaryPassword: string;
  NewPassword: string;
  ConfirmNewPassword: string;
  Device: DeviceContextRequest;
}
export interface ForgotPasswordRequest { Email: string; Device: DeviceContextRequest; }
export interface VerifyPasswordResetOtpRequest { LoginChallengeId: string; OtpCode: string; Device: DeviceContextRequest; }
export interface ResetPasswordRequest {
  LoginChallengeId: string;
  ResetAuthorizationToken: string;
  NewPassword: string;
  ConfirmNewPassword: string;
  Device: DeviceContextRequest;
}
export interface RegisterUserRequest {
  FullName: string;
  Email: string;
  Username?: string;
  PhoneNumber?: string;
  Role: "ADMIN" | "STUDENT" | "TEACHER";
  InstitutionalIdentifier?: string;
}
export interface RequestDeviceReplacementRequest {
  ReplacementType: string;
  Reason: string;
  NewDevice: DeviceContextRequest;
}
export interface ApproveDeviceReplacementRequest {
  DeviceReplacementRequestId: string;
  IsApproved: boolean;
  AdministrativeNote?: string;
}
export interface AdminCreateDeviceReplacementRequest {
  StudentUserId?: number | string;
  StudentEmail?: string;
  Reason: string;
  ExpiryDays?: number;
}
export interface StartDeviceReplacementCompletionRequest {
  DeviceReplacementRequestId: string;
  CurrentPasswordOrTemporaryPassword: string;
}
export interface VerifyDeviceReplacementOtpRequest {
  DeviceReplacementRequestId: string;
  LoginChallengeId: string;
  OtpCode: string;
}

export interface LoginResponse {
  LoginChallengeId?: string;
  ChallengeId?: string;
  AccessToken?: string;
  accessToken?: string;
  TokenType?: string;
  ExpiresAtUtc?: string;
  User?: unknown;
  Device?: unknown;
  Message?: string;
  [key: string]: unknown;
}
