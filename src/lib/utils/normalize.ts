/**
 * Defensive normalization helpers for backend API responses
 * Handles various property naming conventions and missing data
 */

/**
 * Normalize roles from various backend shapes
 * Handles: roles, Roles, role, Role, userRoles, UserRoles, null, undefined, array of objects
 */
export function normalizeRoles(input: unknown): string[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input
      .map((item) => {
        if (typeof item === "string") return item;

        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;

          return (
            obj.name ??
            obj.Name ??
            obj.roleName ??
            obj.RoleName ??
            obj.normalizedRoleName ??
            obj.NormalizedRoleName ??
            obj.normalizedName ??
            obj.NormalizedName ??
            ""
          );
        }

        return "";
      })
      .filter(Boolean)
      .map((role) => String(role).toUpperCase());
  }

  if (typeof input === "string") {
    return [input.toUpperCase()];
  }

  return [];
}

/**
 * Get primary role from normalized roles
 * Priority: ADMIN > TEACHER > STUDENT > first available > UNKNOWN
 */
export function getPrimaryRole(user: unknown): string {
  if (!user || typeof user !== "object") return "UNKNOWN";

  const obj = user as Record<string, unknown>;

  const rawRoles =
    obj.roles ??
    obj.Roles ??
    obj.role ??
    obj.Role ??
    obj.userRoles ??
    obj.UserRoles ??
    [];

  const roles = normalizeRoles(rawRoles);

  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("TEACHER")) return "TEACHER";
  if (roles.includes("STUDENT")) return "STUDENT";

  return roles[0] ?? "UNKNOWN";
}

/**
 * Get role badge with label and CSS className
 */
export function getRoleBadge(user: unknown): { label: string; className: string } {
  const role = getPrimaryRole(user);

  const colors: Record<string, string> = {
    ADMIN: "badge-success",
    TEACHER: "badge-info",
    STUDENT: "badge-primary",
    UNKNOWN: "badge-secondary",
  };

  return {
    label: role,
    className: colors[role] ?? colors.UNKNOWN
  };
}

/**
 * Normalize admin user list item from various backend shapes
 */
export function normalizeAdminUser(raw: any): any {
  return {
    userId: raw.userId ?? raw.UserId ?? raw.id ?? raw.Id,
    fullName: raw.fullName ?? raw.FullName ?? "",
    email: raw.email ?? raw.Email ?? "",
    username: raw.username ?? raw.Username ?? "",
    phoneNumber: raw.phoneNumber ?? raw.PhoneNumber ?? null,
    roles: normalizeRoles(raw),
    accountStatus: raw.accountStatus ?? raw.AccountStatus ?? "UNKNOWN",
    emailVerified: Boolean(raw.emailVerified ?? raw.EmailVerified ?? false),
    firstLoginCompletedAt:
      raw.firstLoginCompletedAt ?? raw.FirstLoginCompletedAt ?? null,
    lastLoginAt: raw.lastLoginAt ?? raw.LastLoginAt ?? null,
    createdAt: raw.createdAt ?? raw.CreatedAt ?? null,
    updatedAt: raw.updatedAt ?? raw.UpdatedAt ?? null,
    deviceStatus: raw.deviceStatus ?? raw.DeviceStatus ?? null,
  };
}

/**
 * Extract users list from various response shapes
 */
export function extractUsersList(raw: any): any[] {
  if (Array.isArray(raw)) return raw;

  if (!raw || typeof raw !== "object") return [];

  const obj = raw as Record<string, any>;

  const users =
    obj.items ??
    obj.Items ??
    obj.users ??
    obj.Users ??
    obj.data?.items ??
    obj.data?.Items ??
    obj.result?.items ??
    obj.result?.Items ??
    [];

  return Array.isArray(users) ? users : [];
}

/**
 * Extract total count from various response shapes
 */
export function extractTotalCount(raw: any): number {
  return (
    raw?.totalCount ??
    raw?.TotalCount ??
    raw?.data?.totalCount ??
    raw?.Data?.TotalCount ??
    0
  );
}
