// src/app/api/internal/messaging/inbound/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireInternalAuth,
  errorResponse,
  InternalApiError,
} from "@/lib/internal-api/auth";
import {
  ConversationChannel,
  ConversationStatus,
  MessageRole,
  MessagingProvider,
} from "@prisma/client";

// ── Normalized n8n payload schema ─────────────────────────────────────────────
// Field mapping from normalized payload → DB:
//   instance          → MessagingIntegration.instanceName  (lookup key)
//   instanceId        → informational only, not persisted in Phase 4A
//   customerPhone     → Customer.phone
//   customerName      → Customer.name  (on creation only)
//   text              → Message.content
//   externalMessageId → Message.externalId  (idempotency key)
const Schema = z.object({
  provider: z.string().min(1),
  event: z.string().min(1),
  instance: z.string().min(1),
  instanceId: z.string().optional(),
  externalMessageId: z.string().min(1),
  customerPhone: z.string().min(1),
  customerName: z.string().optional(),
  messageType: z.string().min(1),
  text: z.string(),
  timestamp: z.number().int(),
  source: z.string().optional(),
  fromMe: z.boolean(),
});

export async function POST(request: NextRequest) {
  const startMs = Date.now();

  try {
    // 1. Authenticate
    await requireInternalAuth(request);

    // 2. Validate payload
    const parsed = Schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }
    const data = parsed.data;

    console.log("[messaging/inbound] received", {
      provider: data.provider,
      instance: data.instance,
      instanceId: data.instanceId ?? null,
      externalMessageId: data.externalMessageId,
      customerPhone: `****${data.customerPhone.slice(-4)}`,
      fromMe: data.fromMe,
    });

    // 3. fromMe guard — outbound messages must not be processed
    if (data.fromMe) {
      console.log("[messaging/inbound] ignored", {
        externalMessageId: data.externalMessageId,
        durationMs: Date.now() - startMs,
        result: "ignored",
      });
      return NextResponse.json({ ignored: true, reason: "fromMe" });
    }

    // 4. Provider switch — route to provider-specific logic
    switch (data.provider) {
      case "evolution":
        break;
      default:
        throw new InternalApiError(
          400,
          "UNSUPPORTED_PROVIDER",
          `Provider "${data.provider}" is not supported`
        );
    }

    // 5–9. All DB work runs in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // 5. Resolve tenant via MessagingIntegration.instanceName
      const integration = await tx.messagingIntegration.findUnique({
        where: {
          provider_instanceName: {
            provider: MessagingProvider.EVOLUTION_API,
            instanceName: data.instance,
          },
        },
        select: { id: true, tenantId: true, isActive: true },
      });

      if (!integration) {
        throw new InternalApiError(
          404,
          "INTEGRATION_NOT_FOUND",
          "No integration found for this instance"
        );
      }
      if (!integration.isActive) {
        throw new InternalApiError(
          409,
          "INTEGRATION_INACTIVE",
          "Integration is inactive"
        );
      }

      const { tenantId } = integration;

      // 6. Idempotency — skip if this externalMessageId was already processed
      const existingMessage = await tx.message.findUnique({
        where: { externalId: data.externalMessageId },
        select: { id: true, conversationId: true },
      });

      if (existingMessage) {
        const conv = await tx.conversation.findUnique({
          where: { id: existingMessage.conversationId },
          select: { id: true, customerId: true },
        });

        console.log("[messaging/inbound] duplicate", {
          externalMessageId: data.externalMessageId,
          tenantId,
          durationMs: Date.now() - startMs,
          result: "duplicate",
        });

        return {
          tenantId,
          customerId: conv?.customerId ?? null,
          conversationId: existingMessage.conversationId,
          messageId: existingMessage.id,
          messagingIntegrationId: integration.id,
          isNewConversation: false,
          isDuplicate: true,
        };
      }

      // 7. Find or create Customer by (tenantId, customerPhone)
      let customer = await tx.customer.findFirst({
        where: { tenantId, phone: data.customerPhone, deletedAt: null },
        select: { id: true },
      });
      if (!customer) {
        customer = await tx.customer.create({
          data: {
            tenantId,
            phone: data.customerPhone,
            name: data.customerName ?? data.customerPhone,
          },
          select: { id: true },
        });
      } else {
        await tx.customer.update({
          where: { id: customer.id },
          data: { lastSeenAt: new Date() },
        });
      }

      // 8. Find or create Conversation by (tenantId, externalId, channel)
      //    externalId is scoped per-instance and per-phone so each customer
      //    gets one continuous thread per Evolution instance.
      const convExternalId = `${data.instance}:${data.customerPhone}`;
      let conversation = await tx.conversation.findFirst({
        where: {
          tenantId,
          externalId: convExternalId,
          channel: ConversationChannel.WHATSAPP,
          deletedAt: null,
        },
        select: { id: true },
      });
      const isNewConversation = !conversation;
      if (!conversation) {
        conversation = await tx.conversation.create({
          data: {
            tenantId,
            customerId: customer.id,
            channel: ConversationChannel.WHATSAPP,
            externalId: convExternalId,
            status: ConversationStatus.OPEN,
            aiHandled: true,
            messagingIntegrationId: integration.id,
          },
          select: { id: true },
        });
      }

      // 9. Save Message
      const message = await tx.message.create({
        data: {
          conversationId: conversation.id,
          role: MessageRole.USER,
          content: data.text,
          externalId: data.externalMessageId,
        },
        select: { id: true },
      });

      return {
        tenantId,
        customerId: customer.id,
        conversationId: conversation.id,
        messageId: message.id,
        messagingIntegrationId: integration.id,
        isNewConversation,
        isDuplicate: false,
      };
    });

    console.log("[messaging/inbound] processed", {
      provider: data.provider,
      instance: data.instance,
      tenantId: result.tenantId,
      externalMessageId: data.externalMessageId,
      isNewConversation: result.isNewConversation,
      durationMs: Date.now() - startMs,
      result: "processed",
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[messaging/inbound] error", {
      durationMs: Date.now() - startMs,
      result: "error",
      error: e instanceof Error ? e.message : String(e),
    });
    return errorResponse(e);
  }
}
