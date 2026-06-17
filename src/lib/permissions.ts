import { Role } from "@prisma/client";

type Permission =
  | "dashboard.view"
  | "analytics.view"
  | "appointments.manage_all"
  | "appointments.manage_own"
  | "customers.view"
  | "customers.edit"
  | "inbox.view"
  | "inbox.send"
  | "team.manage"
  | "working_hours.manage_all"
  | "working_hours.manage_own"
  | "services.manage"
  | "ai_settings.manage"
  | "integrations.manage"
  | "webhooks.manage"
  | "billing.view"
  | "profile.edit"
  | "workspace.delete"
  | "agency.manage_businesses";

const PERMISSION_MAP: Record<Permission, Role[]> = {
  "dashboard.view": ["OWNER", "ADMIN", "MANAGER", "STAFF", "VIEWER"],
  "analytics.view": ["OWNER", "ADMIN", "MANAGER", "VIEWER"],
  "appointments.manage_all": ["OWNER", "ADMIN", "MANAGER"],
  "appointments.manage_own": ["OWNER", "ADMIN", "MANAGER", "STAFF"],
  "customers.view": ["OWNER", "ADMIN", "MANAGER", "STAFF", "VIEWER"],
  "customers.edit": ["OWNER", "ADMIN", "MANAGER"],
  "inbox.view": ["OWNER", "ADMIN", "MANAGER", "STAFF", "VIEWER"],
  "inbox.send": ["OWNER", "ADMIN", "MANAGER", "STAFF"],
  "team.manage": ["OWNER", "ADMIN", "MANAGER"],
  "working_hours.manage_all": ["OWNER", "ADMIN", "MANAGER"],
  "working_hours.manage_own": ["OWNER", "ADMIN", "MANAGER", "STAFF"],
  "services.manage": ["OWNER", "ADMIN", "MANAGER"],
  "ai_settings.manage": ["OWNER", "ADMIN"],
  "integrations.manage": ["OWNER", "ADMIN"],
  "webhooks.manage": ["OWNER", "ADMIN"],
  "billing.view": ["OWNER", "ADMIN"],
  "profile.edit": ["OWNER", "ADMIN"],
  "workspace.delete": ["OWNER"],
  "agency.manage_businesses": ["OWNER", "ADMIN"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSION_MAP[permission]?.includes(role) ?? false;
}

/**
 * Throws a 403 error if the role lacks the required permission.
 * Use in Server Components and Route Handlers.
 */
export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    const error = new Error(
      `Role ${role} does not have permission: ${permission}`
    );
    (error as Error & { status: number }).status = 403;
    throw error;
  }
}

export type { Permission };
