// src/app/api/internal/messaging/inbound/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalAuth, errorResponse, InternalApiError } from "@/lib/internal-api/auth";
import { ConversationChannel, ConversationStatus, MessageRole } from "@prisma/client";

const Schema = z.object({
  instanceName: z.string().min(1),
  provider: z.enum(["EVOLUTION_API"]),
  externalMessageId: z.string().min(1),
  from: z.string().min(1),
  body: z.string(),
  timestamp: z.string(),
  mediaUrl: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireInternalAuth(request);

    const parsed = Schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const data = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Resolve MessagingIntegration → tenantId
      const integration = await tx.messagingIntegration.findUnique({
        where: { provider_instanceName: { provider: data.provider, instanceName: data.instanceName } },
        select: {
          id: true,
          tenantId: true,
          isActive: true,
          tenant: {
            select: {
              aiSettings: { select: { autoBook: true, requireConfirm: true } },
            },
          },
        },
      });

      if (!integration) {
        throw new InternalApiError(404, "INTEGRATION_NOT_FOUND", "No integration found for this instance");
      }
      if (!integration.isActive) {
        throw new InternalApiError(409, "INTEGRATION_INACTIVE", "Integration is inactive");
      }

      const { tenantId } = integration;

      // 2. Upsert Customer by phone
      let customer = await tx.customer.findFirst({
        where: { tenantId, phone: data.from, deletedAt: null },
        select: { id: true },
      });
      if (!customer) {
        customer = await tx.customer.create({
          data: { tenantId, phone: data.from, name: data.from },
          select: { id: true },
        });
      } else {
        await tx.customer.update({
          where: { id: customer.id },
          data: { lastSeenAt: new Date() },
        });
      }

      // 3. Find or create Conversation
      const convExternalId = `${data.instanceName}:${data.from}`;
      let conversation = await tx.conversation.findFirst({
        where: { tenantId, externalId: convExternalId, channel: ConversationChannel.WHATSAPP, deletedAt: null },
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

      // 4. Idempotency check
      const existingMessage = await tx.message.findUnique({
        where: { externalId: data.externalMessageId },
        select: { id: true },
      });
      if (existingMessage) {
        return {
          tenantId,
          customerId: customer.id,
          conversationId: conversation.id,
          messageId: existingMessage.id,
          messagingIntegrationId: integration.id,
          isNewConversation: false,
          isDuplicate: true,
          autoBook: integration.tenant.aiSettings?.autoBook ?? true,
          requireConfirm: integration.tenant.aiSettings?.requireConfirm ?? false,
        };
      }

      // 5. Create Message
      const message = await tx.message.create({
        data: {
          conversationId: conversation.id,
          role: MessageRole.USER,
          content: data.body,
          externalId: data.externalMessageId,
        },
        select: { id: true },
      });

      // 6. Analytics event for new conversations
      if (isNewConversation) {
        await tx.analyticsEvent.create({
          data: {
            tenantId,
            event: "conversation.message_received",
            properties: { channel: "WHATSAPP", customerId: customer.id },
          },
        });
      }

      return {
        tenantId,
        customerId: customer.id,
        conversationId: conversation.id,
        messageId: message.id,
        messagingIntegrationId: integration.id,
        isNewConversation,
        isDuplicate: false,
        autoBook: integration.tenant.aiSettings?.autoBook ?? true,
        requireConfirm: integration.tenant.aiSettings?.requireConfirm ?? false,
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
