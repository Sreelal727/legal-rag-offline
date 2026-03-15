"use client";

import { useSession } from "next-auth/react";
import { hasPermission, type Role, type Permission } from "@/lib/permissions";

interface RoleGateProps {
  children: React.ReactNode;
  permission: Permission;
  fallback?: React.ReactNode;
}

export function RoleGate({ children, permission, fallback = null }: RoleGateProps) {
  const { data: session } = useSession();
  const role = (session?.user?.role || "INTERN") as Role;

  if (!hasPermission(role, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
