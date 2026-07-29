/**
 * Helper functions to extract common fields from API responses
 * Handles various response shapes and property naming conventions
 */

/**
 * Extract challenge ID from login/first-access API response
 * Checks multiple possible property names and nesting patterns
 */
export function extractChallengeId(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;

  const response = raw as Record<string, unknown>;

  // Direct properties
  const direct = 
    response.LoginChallengeId ??
    response.loginChallengeId ??
    response.ChallengeId ??
    response.challengeId;

  if (direct && typeof direct === "string") return direct;

  // Nested in data
  const data = response.data as Record<string, unknown> | undefined;
  if (data) {
    const fromData = 
      data.LoginChallengeId ??
      data.loginChallengeId ??
      data.ChallengeId ??
      data.challengeId;
    if (fromData && typeof fromData === "string") return fromData;
  }

  // Nested in result
  const result = response.result as Record<string, unknown> | undefined;
  if (result) {
    const fromResult = 
      result.LoginChallengeId ??
      result.loginChallengeId ??
      result.ChallengeId ??
      result.challengeId;
    if (fromResult && typeof fromResult === "string") return fromResult;
  }

  return null;
}

/**
 * Extract restricted authorization token from OTP verification response
 */
export function extractRestrictedToken(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;

  const response = raw as Record<string, unknown>;

  // Direct properties
  const direct = 
    response.RestrictedAuthorizationToken ??
    response.restrictedAuthorizationToken ??
    response.RestrictedToken ??
    response.restrictedToken;

  if (direct && typeof direct === "string") return direct;

  // Nested in data
  const data = response.data as Record<string, unknown> | undefined;
  if (data) {
    const fromData = 
      data.RestrictedAuthorizationToken ??
      data.restrictedAuthorizationToken ??
      data.RestrictedToken ??
      data.restrictedToken;
    if (fromData && typeof fromData === "string") return fromData;
  }

  // Nested in result
  const result = response.result as Record<string, unknown> | undefined;
  if (result) {
    const fromResult = 
      result.RestrictedAuthorizationToken ??
      result.restrictedAuthorizationToken ??
      result.RestrictedToken ??
      result.restrictedToken;
    if (fromResult && typeof fromResult === "string") return fromResult;
  }

  return null;
}

/**
 * Extract OTP expiry timestamp from API response
 * Supports both camelCase and PascalCase
 */
export function extractOtpExpiresAt(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;

  const response = raw as Record<string, unknown>;

  // Direct properties
  const direct = 
    response.OtpExpiresAtUtc ??
    response.otpExpiresAtUtc ??
    response.OtpExpiresAt ??
    response.otpExpiresAt;

  if (direct && typeof direct === "string") return direct;

  // Nested in data
  const data = response.data as Record<string, unknown> | undefined;
  if (data) {
    const fromData = 
      data.OtpExpiresAtUtc ??
      data.otpExpiresAtUtc ??
      data.OtpExpiresAt ??
      data.otpExpiresAt;
    if (fromData && typeof fromData === "string") return fromData;
  }

  // Nested in result
  const result = response.result as Record<string, unknown> | undefined;
  if (result) {
    const fromResult = 
      result.OtpExpiresAtUtc ??
      result.otpExpiresAtUtc ??
      result.OtpExpiresAt ??
      result.otpExpiresAt;
    if (fromResult && typeof fromResult === "string") return fromResult;
  }

  return null;
}

/**
 * Extract next resend allowed timestamp from API response
 * Supports both camelCase and PascalCase
 */
export function extractNextResendAllowedAt(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;

  const response = raw as Record<string, unknown>;

  // Direct properties
  const direct = 
    response.NextResendAllowedAtUtc ??
    response.nextResendAllowedAtUtc ??
    response.NextResendAllowedAt ??
    response.nextResendAllowedAt;

  if (direct && typeof direct === "string") return direct;

  // Nested in data
  const data = response.data as Record<string, unknown> | undefined;
  if (data) {
    const fromData = 
      data.NextResendAllowedAtUtc ??
      data.nextResendAllowedAtUtc ??
      data.NextResendAllowedAt ??
      data.nextResendAllowedAt;
    if (fromData && typeof fromData === "string") return fromData;
  }

  // Nested in result
  const result = response.result as Record<string, unknown> | undefined;
  if (result) {
    const fromResult = 
      result.NextResendAllowedAtUtc ??
      result.nextResendAllowedAtUtc ??
      result.NextResendAllowedAt ??
      result.nextResendAllowedAt;
    if (fromResult && typeof fromResult === "string") return fromResult;
  }

  return null;
}

/**
 * Extract challenge expiry timestamp from API response
 * Supports both camelCase and PascalCase
 */
export function extractChallengeExpiresAt(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;

  const response = raw as Record<string, unknown>;

  // Direct properties
  const direct = 
    response.ChallengeExpiresAtUtc ??
    response.challengeExpiresAtUtc ??
    response.ChallengeExpiresAt ??
    response.challengeExpiresAt;

  if (direct && typeof direct === "string") return direct;

  // Nested in data
  const data = response.data as Record<string, unknown> | undefined;
  if (data) {
    const fromData = 
      data.ChallengeExpiresAtUtc ??
      data.challengeExpiresAtUtc ??
      data.ChallengeExpiresAt ??
      data.challengeExpiresAt;
    if (fromData && typeof fromData === "string") return fromData;
  }

  // Nested in result
  const result = response.result as Record<string, unknown> | undefined;
  if (result) {
    const fromResult = 
      result.ChallengeExpiresAtUtc ??
      result.challengeExpiresAtUtc ??
      result.ChallengeExpiresAt ??
      result.challengeExpiresAt;
    if (fromResult && typeof fromResult === "string") return fromResult;
  }

  return null;
}

/**
 * Extract remaining resends count from API response
 * Supports both camelCase and PascalCase
 */
export function extractRemainingResends(raw: unknown): number | null {
  if (!raw || typeof raw !== "object") return null;

  const response = raw as Record<string, unknown>;

  // Direct properties
  const direct = 
    response.RemainingResends ??
    response.remainingResends;

  if (typeof direct === "number") return direct;

  // Nested in data
  const data = response.data as Record<string, unknown> | undefined;
  if (data) {
    const fromData = 
      data.RemainingResends ??
      data.remainingResends;
    if (typeof fromData === "number") return fromData;
  }

  // Nested in result
  const result = response.result as Record<string, unknown> | undefined;
  if (result) {
    const fromResult = 
      result.RemainingResends ??
      result.remainingResends;
    if (typeof fromResult === "number") return fromResult;
  }

  return null;
}
