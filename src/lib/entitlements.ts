import { Plan } from "@prisma/client";

/**
 * Check if a tenant has access to a feature flag.
 * EntitlementOverride takes highest priority; falls back to plan-level default.
 */
export async function hasFeature(
  tenantId: string,
  plan: Plan,
  flagKey: string
): Promise<boolean> {
  const { prisma } = await import("./prisma");

  // 1. Check per-tenant override
  const override = await prisma.entitlementOverride.findUnique({
    where: { tenantId_flagKey: { tenantId, flagKey } },
  });
  if (override) {
    if (!override.expiresAt || override.expiresAt > new Date()) {
      return override.enabled;
    }
    // Expired override — fall through to plan default
  }

  // 2. Plan-level default from FeatureFlag definition
  const flag = await prisma.featureFlag.findUnique({
    where: { key: flagKey },
  });
  return flag?.enabledFor.includes(plan) ?? false;
}
