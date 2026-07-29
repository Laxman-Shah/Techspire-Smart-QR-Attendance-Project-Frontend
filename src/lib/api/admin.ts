import { request } from "@/src/lib/api/client";

// Admin Dashboard Types - matches backend AdminDashboardSummaryResponse
export interface DashboardSummary {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  activeUsers: number;
  pendingFirstAccessUsers: number;
  disabledUsers: number;
  archivedUsers: number;
  activeSessions: number;
  pendingDeviceReplacementRequests: number;
}

// User List Types - matches backend AdminUserListItemResponse
export interface UserListItem {
  userId: number;
  fullName: string;
  email: string;
  username?: string;
  phoneNumber?: string;
  role: string;
  accountStatus: string;
  emailVerified: boolean;
  firstLoginCompletedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
  deviceStatus?: string;
}

// Device Reset Response - matches backend AdminResetUserDeviceResponse
export interface DeviceResetResponse {
  userId: number;
  email: string;
  deviceRevoked: boolean;
  devicesRevokedCount: number;
  sessionsRevoked: number;
  refreshTokensRevokedCount: number;
  pendingChallengesRevoked: number;
  otpTokensRevoked: number;
  deviceReplacementRequestsRevoked?: number;
  message: string;
}

export interface UsersListResponse {
  items: UserListItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

// User Details Types - matches backend AdminUserDetailsResponse
export interface UserDetails {
  userId: number;
  fullName: string;
  email: string;
  username?: string;
  phoneNumber?: string;
  role: string;
  accountStatus: string;
  emailVerified: boolean;
  registrationSource: string;
  createdAt: string;
  updatedAt?: string;
  
  // Credential/Security
  credentialType?: string;
  mustChangePassword?: boolean;
  temporaryPasswordExpiresAt?: string;
  lastPasswordResetAt?: string;
  passwordUpdatedAt?: string;
  failedLoginCount?: number;
  lockedUntil?: string;
  securityVersion?: number;
  
  // Device Binding
  deviceStatus?: string;
  deviceBoundAt?: string;
  approvedDevice?: string;
  installationHash?: string;
  browserName?: string;
  operatingSystem?: string;
  bindingStatus?: string;
  attendanceEligible?: boolean;
  singleDeviceRestricted?: boolean;
  lastSeenAt?: string;
  
  // Login Activity
  firstLoginCompletedAt?: string;
  lastLoginAt?: string;
  
  // Sessions
  activeSessionCount?: number;
  
  // Login Activities
  recentLoginActivityCount?: number;
}

export const adminApi = {
  // Dashboard Summary
  getDashboardSummary: () => request<DashboardSummary>("GET", "/api/admin/dashboard/summary"),
  
  // Users List
  listUsers: (params?: {
    search?: string;
    role?: string;
    accountStatus?: string;
    page?: number;
    pageSize?: number;
  }) => request<UsersListResponse>("GET", "/api/admin/users", undefined, params),
  
  // User Details
  getUserDetails: (userId: number) => request<UserDetails>("GET", `/api/admin/users/${userId}`),
  
  // Disable User
  disableUser: (userId: number, body: { reason: string }) => 
    request("POST", `/api/admin/users/${userId}/disable`, body),
  
  // Archive User
  archiveUser: (userId: number, body: { reason: string }) =>
    request("POST", `/api/admin/users/${userId}/archive`, body),

  // Delete User (safe archive by default)
  deleteUser: (userId: number, body: { reason: string }) =>
    request("POST", `/api/admin/users/${userId}/delete`, body),

  // Permanently Delete User
  permanentlyDeleteUser: (userId: number, body: {
    Reason: string;
    ConfirmEmail: string;
    ForceDeleteModule1Data: boolean;
  }) =>
    request("POST", `/api/admin/users/${userId}/permanent-delete`, body),

  // Revoke User Sessions
  revokeUserSessions: (userId: number, body?: { reason?: string }) => 
    request("POST", `/api/admin/users/${userId}/sessions/revoke-all`, body || {}),
  
  // Send Password Reset Email
  sendPasswordReset: (userId: number, body?: { reason?: string }) => 
    request("POST", `/api/admin/users/${userId}/password-reset/send`, body || {}),

  // Device Management
  adminCreateDeviceReplacement: (body: {
    studentUserId?: number;
    studentEmail?: string;
    reason: string;
    expiryDays?: number;
  }) => request("POST", "/api/auth/device-replacement/admin-create", body),

  resetUserDevice: (body: {
    userId?: number;
    email?: string;
    reason: string;
  }) => request<DeviceResetResponse>("POST", "/api/admin/users/device/reset", body)
};
