"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type ActionResult = { success: boolean; error?: string };

export async function sendMessage(
  tenantId: string,
  tenantSlug: string,
  conversationId: string,
  content: string
): Promise<ActionResult> {
  const trimmed = content.trim();
  if (!trimmed) return { success: false, error: "Message cannot be empty" };

  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId },
    select: { id: true },
  });
  if (!conv) return { success: false, error: "Conversation not found" };

  try {
    await prisma.message.create({
      data: {
        conversationId,
        role: "STAFF",
        content: trimmed,
        isDraft: false,
      },
    });
    // Update updatedAt so conversation re-sorts to top of list
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    revalidatePath(`/${tenantSlug}/inbox`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to send message" };
  }
}

export async function takeoverConversation(
  tenantId: string,
  tenantSlug: string,
  conversationId: string,
  teamMemberId: string
): Promise<ActionResult> {
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

  try {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { assignedToId: teamMemberId },
    });
    revalidatePath(`/${tenantSlug}/inbox`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to take over conversation" };
  }
}

export async function releaseConversation(
  tenantId: string,
  tenantSlug: string,
  conversationId: string
): Promise<ActionResult> {
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId },
    select: { id: true },
  });
  if (!conv) return { success: false, error: "Conversation not found" };

  try {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { assignedToId: null },
    });
    revalidatePath(`/${tenantSlug}/inbox`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to release conversation" };
  }
}

export async function resolveConversation(
  tenantId: string,
  tenantSlug: string,
  conversationId: string
): Promise<ActionResult> {
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId },
    select: { id: true },
  });
  if (!conv) return { success: false, error: "Conversation not found" };

  try {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: "RESOLVED", assignedToId: null },
    });
    revalidatePath(`/${tenantSlug}/inbox`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to resolve conversation" };
  }
}
