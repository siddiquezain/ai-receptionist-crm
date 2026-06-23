"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenantAccess, AuthError } from "@/lib/server-auth";
import { requirePermission } from "@/lib/permissions";

export type ActionResult = { success: boolean; error?: string };

export async function sendMessage(
  tenantId: string,
  tenantSlug: string,
  conversationId: string,
  content: string
): Promise<ActionResult> {
  const trimmed = content.trim();
  if (!trimmed) return { success: false, error: "Message cannot be empty" };

  try {
    const { role } = await requireTenantAccess(tenantId);
    requirePermission(role, "inbox.send");

    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      select: { id: true },
    });
    if (!conv) return { success: false, error: "Conversation not found" };

    await prisma.message.create({
      data: {
        conversationId,
        role: "STAFF",
        content: trimmed,
        isDraft: false,
      },
    });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    revalidatePath(`/${tenantSlug}/inbox`);
    return { success: true };
  } catch (e) {
    if (e instanceof AuthError) return { success: false, error: e.message };
    return { success: false, error: "Failed to send message" };
  }
}

export async function takeoverConversation(
  tenantId: string,
  tenantSlug: string,
  conversationId: string,
  teamMemberId: string
): Promise<ActionResult> {
  try {
    const { role } = await requireTenantAccess(tenantId);
    requirePermission(role, "inbox.send");

    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      select: { id: true },
    });
    if (!conv) return { success: false, error: "Conversation not found" };

    const member = await prisma.teamMember.findFirst({
      where: { id: teamMemberId, tenantId },
      select: { id: true },
    });
    if (!member) return { success: false, error: "Team member not found" };

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { assignedToId: teamMemberId },
    });
    revalidatePath(`/${tenantSlug}/inbox`);
    return { success: true };
  } catch (e) {
    if (e instanceof AuthError) return { success: false, error: e.message };
    return { success: false, error: "Failed to take over conversation" };
  }
}

export async function releaseConversation(
  tenantId: string,
  tenantSlug: string,
  conversationId: string
): Promise<ActionResult> {
  try {
    const { role } = await requireTenantAccess(tenantId);
    requirePermission(role, "inbox.send");

    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      select: { id: true },
    });
    if (!conv) return { success: false, error: "Conversation not found" };

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { assignedToId: null },
    });
    revalidatePath(`/${tenantSlug}/inbox`);
    return { success: true };
  } catch (e) {
    if (e instanceof AuthError) return { success: false, error: e.message };
    return { success: false, error: "Failed to release conversation" };
  }
}

export async function resolveConversation(
  tenantId: string,
  tenantSlug: string,
  conversationId: string
): Promise<ActionResult> {
  try {
    const { role } = await requireTenantAccess(tenantId);
    requirePermission(role, "inbox.send");

    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      select: { id: true },
    });
    if (!conv) return { success: false, error: "Conversation not found" };

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: "RESOLVED", assignedToId: null },
    });
    revalidatePath(`/${tenantSlug}/inbox`);
    return { success: true };
  } catch (e) {
    if (e instanceof AuthError) return { success: false, error: e.message };
    return { success: false, error: "Failed to resolve conversation" };
  }
}
