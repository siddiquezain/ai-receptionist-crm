"use server";

import { revalidatePath } from "next/cache";
import { MessagingProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTenantAccess, AuthError } from "@/lib/server-auth";
import { requirePermission } from "@/lib/permissions";
import { encrypt } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function saveMessagingIntegration(
  tenantId: string,
  tenantSlug: string,
  data: {
    provider: MessagingProvider;
    instanceName: string;
    displayName: string;
    apiEndpoint: string;
    apiKey: string;
    phoneNumber?: string;
  }
): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId, role } = await requireTenantAccess(tenantId);
    requirePermission(role, "integrations.manage");

    const instanceName  = data.instanceName.trim();
    const displayName   = data.displayName.trim();
    const apiEndpoint   = data.apiEndpoint.trim();
    const phoneNumber   = data.phoneNumber?.trim();
    const apiKey        = data.apiKey.trim();

    if (!instanceName) {
      return { success: false, error: "Instance name is required" };
    }
    if (!apiKey) {
      return { success: false, error: "API key is required" };
    }

    const encryptedApiKey = encrypt(apiKey);

    const existing = await prisma.messagingIntegration.findFirst({
      where: { tenantId, provider: data.provider, deletedAt: null },
      select: { id: true },
    });

    let integrationId: string;

    if (existing) {
      await prisma.messagingIntegration.update({
        where: { id: existing.id },
        data: {
          instanceName,
          displayName: displayName || null,
          apiEndpoint: apiEndpoint || null,
          apiKey: encryptedApiKey,
          phoneNumber: phoneNumber || null,
          isActive: true,
        },
      });
      integrationId = existing.id;
    } else {
      const integration = await prisma.messagingIntegration.create({
        data: {
          tenantId,
          provider: data.provider,
          instanceName,
          displayName: displayName || null,
          apiEndpoint: apiEndpoint || null,
          apiKey: encryptedApiKey,
          phoneNumber: phoneNumber || null,
        },
        select: { id: true },
      });
      integrationId = integration.id;
    }

    void logAudit({
      tenantId,
      actorId: userId,
      action: existing
        ? "messaging_integration.updated"
        : "messaging_integration.created",
      resource: "MessagingIntegration",
      resourceId: integrationId,
    });

    revalidatePath(`/${tenantSlug}/settings/integrations`);
    return { success: true, data: { id: integrationId } };
  } catch (e) {
    if (e instanceof AuthError) return { success: false, error: e.message };
    return { success: false, error: "Failed to save integration" };
  }
}

export async function disableMessagingIntegration(
  tenantId: string,
  tenantSlug: string,
  integrationId: string
): Promise<ActionResult> {
  try {
    const { userId, role } = await requireTenantAccess(tenantId);
    requirePermission(role, "integrations.manage");

    await prisma.messagingIntegration.update({
      where: { id: integrationId, tenantId },
      data: { isActive: false },
    });

    void logAudit({
      tenantId,
      actorId: userId,
      action: "messaging_integration.disabled",
      resource: "MessagingIntegration",
      resourceId: integrationId,
    });

    revalidatePath(`/${tenantSlug}/settings/integrations`);
    return { success: true };
  } catch (e) {
    if (e instanceof AuthError) return { success: false, error: e.message };
    return { success: false, error: "Failed to disable integration" };
  }
}
