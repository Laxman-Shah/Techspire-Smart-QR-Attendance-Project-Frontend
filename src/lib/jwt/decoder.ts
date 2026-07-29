/**
 * JWT decoder utility for debugging token claims
 * This is a client-side only utility for development/debugging
 */

export interface JwtPayload {
  [key: string]: unknown;
  sub?: string;
  email?: string;
  name?: string;
  role?: string | string[];
  roles?: string | string[];
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"?: string | string[];
  exp?: number;
  iat?: number;
  nbf?: number;
}

/**
 * Decode a JWT token without verification (client-side only)
 * @param token - The JWT token string
 * @returns Decoded payload or null if invalid
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = atob(payload);
    const json = JSON.parse(decoded);

    return json;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Extract roles from JWT payload
 * Checks multiple possible claim types
 */
export function extractRolesFromToken(token: string): string[] {
  const payload = decodeJwt(token);
  if (!payload) return [];

  // Check various possible role claim locations
  const roleClaims = [
    payload.role,
    payload.roles,
    payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
  ];

  const roles: string[] = [];

  for (const claim of roleClaims) {
    if (typeof claim === 'string') {
      roles.push(claim);
    } else if (Array.isArray(claim)) {
      roles.push(...claim);
    }
  }

  return roles;
}

/**
 * Check if token has a specific role
 */
export function hasRole(token: string, role: string): boolean {
  const roles = extractRolesFromToken(token);
  return roles.includes(role);
}

/**
 * Get token expiration date
 */
export function getTokenExpiration(token: string): Date | null {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return null;

  return new Date(payload.exp * 1000);
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const expiration = getTokenExpiration(token);
  if (!expiration) return false;

  return expiration < new Date();
}
