export type Role = "ADMIN" | "SENIOR_ADVOCATE" | "JUNIOR_ADVOCATE" | "CLERK" | "INTERN";

export type Permission =
  | "clients:read" | "clients:write" | "clients:delete"
  | "cases:read" | "cases:write" | "cases:delete" | "cases:assign"
  | "documents:read" | "documents:upload" | "documents:delete"
  | "diary:read" | "diary:write" | "diary:delete"
  | "schedule:read" | "schedule:write" | "schedule:delete"
  | "notices:read" | "notices:draft" | "notices:approve" | "notices:send"
  | "chat:use"
  | "limitation:read" | "limitation:write"
  | "billing:read" | "billing:write"
  | "users:read" | "users:write" | "users:delete"
  | "settings:read" | "settings:write"
  | "audit:read";

const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: [
    "clients:read", "clients:write", "clients:delete",
    "cases:read", "cases:write", "cases:delete", "cases:assign",
    "documents:read", "documents:upload", "documents:delete",
    "diary:read", "diary:write", "diary:delete",
    "schedule:read", "schedule:write", "schedule:delete",
    "notices:read", "notices:draft", "notices:approve", "notices:send",
    "chat:use",
    "limitation:read", "limitation:write",
    "billing:read", "billing:write",
    "users:read", "users:write", "users:delete",
    "settings:read", "settings:write",
    "audit:read",
  ],
  SENIOR_ADVOCATE: [
    "clients:read", "clients:write",
    "cases:read", "cases:write", "cases:assign",
    "documents:read", "documents:upload",
    "diary:read", "diary:write",
    "schedule:read", "schedule:write",
    "notices:read", "notices:draft", "notices:approve", "notices:send",
    "chat:use",
    "limitation:read", "limitation:write",
    "billing:read", "billing:write",
    "users:read",
  ],
  JUNIOR_ADVOCATE: [
    "clients:read", "clients:write",
    "cases:read", "cases:write",
    "documents:read", "documents:upload",
    "diary:read", "diary:write",
    "schedule:read", "schedule:write",
    "notices:read", "notices:draft",
    "chat:use",
    "limitation:read", "limitation:write",
    "billing:read", "billing:write",
  ],
  CLERK: [
    "clients:read", "clients:write",
    "cases:read",
    "documents:read", "documents:upload",
    "diary:read", "diary:write",
    "schedule:read", "schedule:write",
    "notices:read",
    "limitation:read",
    "billing:read",
  ],
  INTERN: [
    "clients:read",
    "cases:read",
    "documents:read",
    "diary:read",
    "schedule:read",
    "notices:read", "notices:draft",
    "chat:use",
    "limitation:read",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function getUserPermissions(role: Role): Permission[] {
  return rolePermissions[role] ?? [];
}

export function canAccessRoute(role: Role, path: string): boolean {
  const routePermissions: Record<string, Permission> = {
    "/clients": "clients:read",
    "/cases": "cases:read",
    "/documents": "documents:read",
    "/diary": "diary:read",
    "/schedule": "schedule:read",
    "/notices": "notices:read",
    "/chat": "chat:use",
    "/users": "users:read",
    "/settings": "settings:read",
    "/limitation": "limitation:read",
    "/billing": "billing:read",
    "/audit": "audit:read",
  };

  for (const [route, permission] of Object.entries(routePermissions)) {
    if (path.startsWith(route)) {
      return hasPermission(role, permission);
    }
  }
  return true; // Allow access to routes without specific permissions (dashboard, etc.)
}
