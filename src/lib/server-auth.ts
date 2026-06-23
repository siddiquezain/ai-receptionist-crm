// src/lib/server-auth.ts
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getTenantMembership } from "@/lib/tenant";
import type { Role } from "@prisma/client";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403 = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Verifies the Supabase session and returns the authenticated Prisma user ID.
 * Throws AuthError(401) if the session is missing or the Prisma record doesn't exist.
 */
export async function requireAuth(): Promise<{ userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AuthError("Unauthorized");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: user.id },
    select: { id: true },
  });
  if (!dbUser) throw new AuthError("Unauthorized");

  return { userId: dbUser.id };
}

/**
 * Verifies auth AND that the authenticated user is a member of tenantId.
 * Returns { userId, role } so callers can check permissions.
 * Throws AuthError(401) or AuthError(403).
 */
export async function requireTenantAccess(
  tenantId: string
): Promise<{ userId: string; role: Role }> {
  const { userId } = await requireAuth();
  const membership = await getTenantMembership(userId, tenantId);
  if (!membership) throw new AuthError("Forbidden", 403);
  return { userId, role: membership.role };
}
