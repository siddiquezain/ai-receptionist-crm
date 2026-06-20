"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { n8nSendReply } from "@/lib/n8n";

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
    select: { id: true, channel: true, externalId: true },
  });
  if (!conv) return { success: false, error: "Conversation not found" };

  // ── Primary path: delegate to n8n for WHATSAPP channels ─────────────────
  // n8n handles both: writing the Message to Supabase AND sending via Evolution API.
  // For WEB_CHAT, n8n is optional — the DB write below is sufficient.
  if (conv.channel === "WHATSAPP") {
    const handled = await n8nSendReply({
      tenantId,
      conversationId,
      content: trimmed,
      channel: "WHATSAPP",
      to: conv.externalId,
    });
    if (handled) {
      // n8n wrote the Message row and sent via Evolution API.
      // Supabase Realtime will push the new message to the Inbox client.
      revalidatePath(`/${tenantSlug}/inbox`);
      return { success: true };
    }
    // n8n not configured — fall through to DB-only write.
    // The message will appear in the Inbox but won't be delivered via WhatsApp.
    // This is the expected pre-n8n behaviour.
  }

  // ── Fallback: write directly to DB ───────────────────────────────────────
  try {
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
