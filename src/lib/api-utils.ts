import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth-options";
import { hasPermission, Permission, Role } from "./permissions";
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from "./rate-limit";

export interface AuthSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string;
    organizationName: string;
  };
}

export async function getSession() {
  return getServerSession(authOptions);
}

export async function withAuth(permission?: Permission) {
  const session = await getSession();

  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }

  const user = session.user as any;

  if (!user.organizationId) {
    return { error: NextResponse.json({ error: "No organization context" }, { status: 403 }), session: null };
  }

  // Rate limit API requests per user
  const rateLimitKey = `api:${user.id}`;
  const { allowed, remaining, resetMs } = checkRateLimit(rateLimitKey, RATE_LIMITS.api);
  if (!allowed) {
    return {
      error: NextResponse.json(
        { error: "Rate limit exceeded. Please slow down." },
        { status: 429, headers: getRateLimitHeaders(remaining, resetMs) }
      ),
      session: null,
    };
  }

  if (permission && !hasPermission(user.role as Role, permission)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }

  return { error: null, session: session as unknown as AuthSession };
}

/**
 * Get the organizationId from the current session.
 * Use this in every database query to enforce tenant isolation.
 */
export function getOrgId(session: AuthSession): string {
  return session.user.organizationId;
}
