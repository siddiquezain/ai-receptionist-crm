// src/app/api/internal/ai/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireInternalAuth,
  requireTenant,
  errorResponse,
  InternalApiError,
} from "@/lib/internal-api/auth";
import { getAIProvider, estimateCostUsd } from "@/lib/ai";
import { decrypt, isEncrypted } from "@/lib/crypto";
import { MessageRole } from "@prisma/client";

const Schema = z.object({
  tenantId: z.string().min(1),
  conversationId: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    await requireInternalAuth(request);

    const parsed = Schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 422 }
      );
    }
    const { tenantId, conversationId, messages } = parsed.data;

    await requireTenant(tenantId);

    const aiSettings = await prisma.aISettings.findUnique({
      where: { tenantId },
      select: {
        provider: true,
        model: true,
        temperature: true,
        maxTokens: true,
        systemPrompt: true,
        byokApiKey: true,
        fallbackProvider: true,
        fallbackModel: true,
      },
    });

    const settings = aiSettings ?? {
      provider: "openai",
      model: "gpt-4o",
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: null,
      byokApiKey: null,
      fallbackProvider: null,
      fallbackModel: null,
    };

    // Decrypt BYOK key if set
    const apiKey =
      settings.byokApiKey && isEncrypted(settings.byokApiKey)
        ? decrypt(settings.byokApiKey)
        : undefined;

    const providerSettings = {
      provider: settings.provider,
      model: settings.model,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      apiKey,
    };

    const allMessages = settings.systemPrompt
      ? [{ role: "system" as const, content: settings.systemPrompt }, ...messages]
      : messages;

    let aiResponse;
    try {
      const provider = getAIProvider(providerSettings);
      aiResponse = await provider.chat(allMessages, providerSettings);
    } catch (primaryErr) {
      if (settings.fallbackProvider) {
        const fallbackSettings = {
          ...providerSettings,
          provider: settings.fallbackProvider,
          model: settings.fallbackModel ?? providerSettings.model,
          apiKey: undefined,
        };
        try {
          const fallbackProvider = getAIProvider(fallbackSettings);
          aiResponse = await fallbackProvider.chat(allMessages, fallbackSettings);
        } catch {
          throw new InternalApiError(502, "AI_PROVIDER_ERROR", "AI provider failed");
        }
      } else {
        throw new InternalApiError(502, "AI_PROVIDER_ERROR", "AI provider failed");
      }
    }

    const [message] = await Promise.all([
      prisma.message.create({
        data: {
          conversationId,
          role: MessageRole.ASSISTANT,
          content: aiResponse.content,
          tokensUsed: aiResponse.totalTokens,
          provider: aiResponse.provider,
          model: aiResponse.model,
        },
        select: { id: true },
      }),
      prisma.aIUsageRecord.create({
        data: {
          tenantId,
          conversationId,
          provider: aiResponse.provider,
          model: aiResponse.model,
          promptTokens: aiResponse.promptTokens,
          completionTokens: aiResponse.completionTokens,
          totalTokens: aiResponse.totalTokens,
          estimatedCostUsd: estimateCostUsd(
            aiResponse.provider,
            aiResponse.model,
            aiResponse.promptTokens,
            aiResponse.completionTokens
          ),
          isByok: !!apiKey,
        },
      }),
    ]);

    return NextResponse.json({
      messageId: message.id,
      content: aiResponse.content,
      tokensUsed: aiResponse.totalTokens,
      provider: aiResponse.provider,
      model: aiResponse.model,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
