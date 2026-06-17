import { headers } from "next/headers";
import { prisma } from "./prisma";

export const TENANT_HEADER = "x-tenant-id";
export const TENANT_SLUG_HEADER = "x-tenant-slug";

/**
 * Read tenant ID injected by middleware. Call from Server Components and Route Handlers.
 * Throws if header is absent — indicates middleware misconfiguration.
 */
export async function getTenantIdFromHeaders(): Promise<string> {
  const headersList = await headers();
  const tenantId = headersList.get(TENANT_HEADER);
  if (!tenantId) {
    throw new Error(
      "Tenant ID header missing. Ensure middleware.ts is running for this route."
    );
  }
  return tenantId;
}

/**
 * Resolve a tenant by slug. Returns null if not found or soft-deleted.
 */
export async function resolveTenantBySlug(slug: string) {
  return prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      timezone: true,
      logo: true,
      parentTenantId: true,
    },
  });
}

/**
 * Verify user is a member of tenant. Returns membership or null.
 */
export async function getTenantMembership(userId: string, tenantId: string) {
  return prisma.tenantMember.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
    select: { role: true, tenantId: true },
  });
}
