import type { RoleName } from "@/src/types/api";

/**
 * Extract user role from login response with flexible field name handling
 */
export function getUserRole(response: unknown): RoleName | null {
  if (!response || typeof response !== "object") return null;
  
  const data = response as Record<string, unknown>;
  
  // Helper to safely get nested property
  const getNested = (obj: unknown, path: string): unknown => {
    if (!obj || typeof obj !== "object") return undefined;
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return current;
  };
  
  // Try various possible paths to roles
  const roles = 
    getNested(data, 'User.Roles') ||
    getNested(data, 'user.roles') ||
    getNested(data, 'Roles') ||
    getNested(data, 'roles') ||
    getNested(data, 'User.role') ||
    getNested(data, 'user.role') ||
    getNested(data, 'Role') ||
    getNested(data, 'role');
  
  if (!roles) return null;
  
  // Handle array of roles
  if (Array.isArray(roles)) {
    const roleString = roles[0];
    if (typeof roleString === "string") {
      return normalizeRole(roleString);
    }
  }
  
  // Handle single role string
  if (typeof roles === "string") {
    return normalizeRole(roles);
  }
  
  return null;
}

/**
 * Normalize role string to RoleName enum
 */
function normalizeRole(role: string): RoleName | null {
  const upper = role.toUpperCase();
  if (upper === "ADMIN") return "ADMIN";
  if (upper === "STUDENT") return "STUDENT";
  if (upper === "TEACHER") return "TEACHER";
  return null;
}

/**
 * Check if user has specific role
 */
export function hasRole(response: unknown, role: RoleName): boolean {
  return getUserRole(response) === role;
}

/**
 * Check if user is admin
 */
export function isAdmin(response: unknown): boolean {
  return hasRole(response, "ADMIN");
}

/**
 * Check if user is student
 */
export function isStudent(response: unknown): boolean {
  return hasRole(response, "STUDENT");
}

/**
 * Check if user is teacher
 */
export function isTeacher(response: unknown): boolean {
  return hasRole(response, "TEACHER");
}
