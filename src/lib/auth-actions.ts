"use server";

import { prisma } from "./prisma";
import { slugify } from "./utils";

/**
 * Returns the slug of the first tenant the user belongs to, or null if none.
 * Called after login to determine where to redirect.
 */
export async function getFirstTenantSlug(
  supabaseUserId: string
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { supabaseAuthId: supabaseUserId },
    select: {
      memberships: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: {
          tenant: {
            select: { slug: true },
          },
        },
      },
    },
  });
  return user?.memberships[0]?.tenant.slug ?? null;
}

/**
 * Idempotent: creates (or retrieves) the User, Tenant, and TenantMember for a
 * newly registered Supabase user. Safe to call multiple times — skips creation
 * if records already exist.
 *
 * Returns the tenant slug.
 */
export async function ensureUserWithTenant(params: {
  supabaseUserId: string;
  email: string;
  fullName: string;
  businessName: string;
}): Promise<string> {
  const { supabaseUserId, email, fullName, businessName } = params;

  // Upsert User
  const user = await prisma.user.upsert({
    where: { supabaseAuthId: supabaseUserId },
    update: {},
    create: {
      supabaseAuthId: supabaseUserId,
      email,
      name: fullName,
    },
  });

  // Check if user already has a tenant membership
  const existing = await prisma.tenantMember.findFirst({
    where: { userId: user.id },
    include: { tenant: { select: { slug: true } } },
  });
  if (existing) return existing.tenant.slug;

  // Generate unique slug from business name
  const baseSlug = slugify(businessName);
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.tenant.findFirst({ where: { slug } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  // Create Tenant + TenantMember in a transaction
  const tenant = await prisma.$transaction(async (tx) => {
    const t = await tx.tenant.create({
      data: {
        name: businessName,
        slug,
      },
    });
    await tx.tenantMember.create({
      data: {
        userId: user.id,
        tenantId: t.id,
        role: "OWNER",
      },
    });
    return t;
  });

  return tenant.slug;
}
