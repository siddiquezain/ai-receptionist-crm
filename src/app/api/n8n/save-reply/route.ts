/**
 * n8n save-reply endpoint — called by n8n after the AI Agent produces a response.
 *
 * Persists the assistant message, logs AI usage, and updates Conversation.updatedAt.
 * Returns { ok: true, messageId } on success.
 *
 * Auth: x-n8n-secret header must match N8N_INTERNAL_SECRET env var (when set).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estimateCostUsd } from "@/lib/ai";

export async function POST(request: NextRequest) {
  const secret = process.env.N8N_INTERNAL_SECRET;
  if (secret && request.headers.get("x-n8n-secret") !== secret) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let body: {
    conversationId: string;
    tenantId: string;
    content: string;
    provider?: string;
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    conversationId,
    tenantId,
    content,
    provider,
    model,
    promptTokens = 0,
    completionTokens = 0,
  } = body;

  if (!conversationId || !tenantId || !content) {
    return NextResponse.json(
      { error: "Missing conversationId, tenantId, or content" },
      { status: 400 }
    );
  }

  const [message] = await Promise.all([
    prisma.message.create({
      data: {
        conversationId,
        role: "ASSISTANT",
        content,
        tokensUsed: promptTokens + completionTokens || null,
        provider: provider ?? null,
        model: model ?? null,
        isDraft: false,
      },
      select: { id: true },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  if (provider && model && (promptTokens || completionTokens)) {
    const estimatedCostUsd = estimateCostUsd(
      provider,
      model,
      promptTokens,
      completionTokens
    );
    await prisma.aIUsageRecord
      .create({
        data: {
          tenantId,
          conversationId,
          provider,
          model,
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          estimatedCostUsd,
          isByok: false,
        },
      })
      .catch((err) => console.error("[n8n/save-reply] usage log failed:", err));
  }

  return NextResponse.json({ ok: true, messageId: message.id });
}
